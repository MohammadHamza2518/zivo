'use strict';

/**
 * Zivo Matchmaking Engine
 * In-memory queue with interest-tag matching and filter support.
 */

class MatchmakingQueue {
  constructor() {
    // Map of socketId -> { socketId, interests[], country, gender, joinedAt }
    this.waiting = new Map();
    // Map of socketId -> partnerId (active sessions)
    this.sessions = new Map();
    // Map of socketId -> Set of blocked socketIds
    this.blocklist = new Map();
  }

  /**
   * Add a user to the matchmaking queue.
   * @param {string} socketId
   * @param {object} prefs - { interests, country, gender }
   */
  enqueue(socketId, prefs = {}) {
    if (this.sessions.has(socketId)) {
      this.leaveSession(socketId);
    }
    this.waiting.set(socketId, {
      socketId,
      interests: prefs.interests || [],
      country: prefs.country || null,
      gender: prefs.gender || null,
      joinedAt: Date.now(),
    });
  }

  /**
   * Try to find a match for a given socket.
   * Returns [socketIdA, socketIdB] or null.
   */
  tryMatch(socketId) {
    const user = this.waiting.get(socketId);
    if (!user) return null;

    let bestMatch = null;
    let bestScore = -1;

    for (const [candidateId, candidate] of this.waiting) {
      if (candidateId === socketId) continue;
      if (this._isBlocked(socketId, candidateId)) continue;

      const score = this._compatibilityScore(user, candidate);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = candidateId;
      }
    }

    if (!bestMatch) return null;

    // Remove both from queue and create session
    this.waiting.delete(socketId);
    this.waiting.delete(bestMatch);
    this.sessions.set(socketId, bestMatch);
    this.sessions.set(bestMatch, socketId);

    return [socketId, bestMatch];
  }

  /**
   * Try to match anyone in queue (called periodically or on new join).
   */
  tryMatchAll() {
    const pairs = [];
    const processed = new Set();

    for (const [socketId] of this.waiting) {
      if (processed.has(socketId)) continue;
      const result = this.tryMatch(socketId);
      if (result) {
        pairs.push(result);
        processed.add(result[0]);
        processed.add(result[1]);
      }
    }

    return pairs;
  }

  /**
   * Get the partner of a given socket.
   */
  getPartner(socketId) {
    return this.sessions.get(socketId) || null;
  }

  /**
   * End a session for a socket.
   * Returns the partner's socketId or null.
   */
  leaveSession(socketId) {
    const partner = this.sessions.get(socketId);
    this.sessions.delete(socketId);
    if (partner) {
      this.sessions.delete(partner);
    }
    this.waiting.delete(socketId);
    return partner;
  }

  /**
   * Remove a socket entirely (on disconnect).
   */
  remove(socketId) {
    const partner = this.leaveSession(socketId);
    this.waiting.delete(socketId);
    this.blocklist.delete(socketId);
    return partner;
  }

  /**
   * Add a block entry.
   */
  block(socketId, targetId) {
    if (!this.blocklist.has(socketId)) {
      this.blocklist.set(socketId, new Set());
    }
    this.blocklist.get(socketId).add(targetId);
  }

  /**
   * Total waiting users.
   */
  get waitingCount() {
    return this.waiting.size;
  }

  /**
   * Total active sessions (pairs, so divide by 2 for pair count).
   */
  get activeCount() {
    return this.sessions.size;
  }

  /**
   * Total online users.
   */
  get onlineCount() {
    return this.waiting.size + this.sessions.size;
  }

  /** Queue length (for admin) */
  size() { return this.waiting.size; }

  /** Is socket in waiting queue? (for admin) */
  isQueued(socketId) { return this.waiting.has(socketId); }

  // --- Private helpers ---

  _compatibilityScore(a, b) {
    let score = 0;

    // Interest overlap
    if (a.interests.length > 0 && b.interests.length > 0) {
      const setA = new Set(a.interests.map((i) => i.toLowerCase()));
      const overlap = b.interests.filter((i) =>
        setA.has(i.toLowerCase())
      ).length;
      score += overlap * 10;
    } else {
      // No interests specified — small default score so they still match
      score += 1;
    }

    // Country match bonus
    if (a.country && b.country && a.country === b.country) {
      score += 5;
    }

    // Gender preference
    if (a.gender && b.gender) {
      // Simple: reward if genders are different (default Omegle-like)
      if (a.gender !== b.gender) score += 3;
    }

    return score;
  }

  _isBlocked(a, b) {
    return (
      (this.blocklist.get(a) && this.blocklist.get(a).has(b)) ||
      (this.blocklist.get(b) && this.blocklist.get(b).has(a))
    );
  }
}

module.exports = MatchmakingQueue;

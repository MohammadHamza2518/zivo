'use client';

export const STUN_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;

  // Callbacks
  public onRemoteStream: ((stream: MediaStream) => void) | null = null;
  public onIceCandidate: ((candidate: RTCIceCandidate) => void) | null = null;
  public onOffer: ((offer: RTCSessionDescriptionInit) => void) | null = null;
  public onAnswer: ((answer: RTCSessionDescriptionInit) => void) | null = null;
  public onConnectionStateChange: ((state: RTCPeerConnectionState) => void) | null = null;

  async getUserMedia(video = true, audio = true): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
        audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
      });
      this.localStream = stream;
      return stream;
    } catch (err) {
      console.error('getUserMedia error:', err);
      throw err;
    }
  }

  createPeerConnection(): RTCPeerConnection {
    this.pc = new RTCPeerConnection(STUN_SERVERS);

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.pc!.addTrack(track, this.localStream!);
      });
    }

    // Remote stream
    const remoteStream = new MediaStream();
    this.pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
      this.onRemoteStream?.(remoteStream);
    };

    // ICE candidates
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.onIceCandidate?.(event.candidate);
      }
    };

    // Connection state
    this.pc.onconnectionstatechange = () => {
      this.onConnectionStateChange?.(this.pc!.connectionState);
    };

    return this.pc;
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) throw new Error('No peer connection');
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) throw new Error('No peer connection');
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) throw new Error('No peer connection');
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc) return;
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('ICE candidate error:', err);
    }
  }

  setVideoEnabled(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach((t) => (t.enabled = enabled));
  }

  setAudioEnabled(enabled: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = enabled));
  }

  cleanup() {
    this.pc?.close();
    this.pc = null;
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
  }

  stopLocal() {
    this.pc?.close();
    this.pc = null;
  }

  get peerConnection() {
    return this.pc;
  }

  get stream() {
    return this.localStream;
  }
}

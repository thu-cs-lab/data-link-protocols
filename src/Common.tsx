import { useCallback, useEffect, useState } from 'react';

export interface HasToString {
  toString: () => string;
}

export function AddRowMarker(code: string, line: number | undefined) {
  let res = "";
  let i = 0;
  for (let part of code.split("\n")) {
    if (line === i - 1) {
      res += "->";
      res += part.substring(2);
    } else {
      res += part;
    }
    if (i > 0) {
      res += "\n";
    }
    i += 1;
  }
  return res;
}

export class Packet {
  constructor(
    public payload?: string,
  ) { }

  public toString = (): string => {
    let entries = [];
    if (this.payload !== undefined) {
      entries.push(`payload: ${this.payload}`);
    }

    return `Packet (${entries.join(", ")})`;
  }

  public clone = (): Packet => {
    return new Packet(this.payload);
  }
}

export enum FrameKind {
  Data = "Data",
  Ack = "Ack",
  Nak = "Nak"
}

export class Frame {
  constructor(
    public info?: Packet,
    public seq?: number,
    public ack?: number,
    public kind?: FrameKind
  ) { }

  public withInfo = (info: Packet): Frame => {
    const s = this.clone();
    s.info = info;
    return s;
  }

  public withSeq = (seq: number): Frame => {
    const s = this.clone();
    s.seq = seq;
    return s;
  }

  public withAck = (ack: number): Frame => {
    const s = this.clone();
    s.ack = ack;
    return s;
  }

  public withKind = (kind: FrameKind): Frame => {
    const s = this.clone();
    s.kind = kind;
    return s;
  }

  public toString = (): string => {
    let entries = [];
    if (this.info !== undefined) {
      entries.push(`info: ${this.info}`);
    }
    if (this.seq !== undefined) {
      entries.push(`seq: ${this.seq}`);
    }
    if (this.ack !== undefined) {
      entries.push(`ack: ${this.ack}`);
    }
    if (this.kind !== undefined) {
      entries.push(`kind: ${this.kind}`);
    }

    return `Frame (${entries.join(", ")})`;
  }

  public clone = (): Frame => {
    return new Frame(this.info?.clone(), this.seq, this.ack, this.kind);
  }
}

export enum Event {
  FrameArrival = "Frame Arrival",
  CksumError = "Checksum Error",
  Timeout = "Timeout",
  AckTimeout = "Ack Timeout",
  NetworkLayerReady = "Network Layer Ready"
}

export type EventType = Event.FrameArrival
  | Event.CksumError
  | Event.Timeout
  | [Event.Timeout, number] // timeout of a sequence number, set oldest_frame in protocol 6
  | Event.AckTimeout
  | Event.NetworkLayerReady;

export const STALL_FROM_NETWORK_LAYER = "没有可以从网络层读取的分组";
export const STALL_FROM_PHYSICAL_LAYER = "没有可以从物理层读取的帧";
export const STALL_WAIT_FOR_EVENT = "没有新的事件";

export function FastForwarder(canStep: () => boolean, step: () => void) {
  // do not call step() in a loop, because react has delayed updates
  // use useEffect with counter to achieve update in a loop
  const [fastForwardCounter, setFastForwardCounter] = useState(0);
  const fastForward = useCallback(() => {
    if (canStep()) {
      setFastForwardCounter(fastForwardCounter + 1);
    }
    // deliberately not adding fastForwardCounter, step & canStep to dependency list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (fastForwardCounter !== 0 && canStep()) {
      step();
      setFastForwardCounter(fastForwardCounter + 1);
    }
    // deliberately not adding step & canStep to dependency list
    // but adding fastForwardCounter is required to re-trigger update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fastForwardCounter]);

  return fastForward;
}
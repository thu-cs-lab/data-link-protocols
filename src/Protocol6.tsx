import { useCallback, useState } from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { Viewer, ViewerState } from './Viewer';
import { Frame, Packet, Event, STALL_FROM_NETWORK_LAYER, STALL_FROM_PHYSICAL_LAYER, STALL_WAIT_FOR_EVENT, FrameKind } from './Common';

export function Protocol6() {
  const MAX_SEQ = 7;
  const NR_BUFS = (MAX_SEQ + 1) / 2;

  const [senderNoNak6, setSenderNoNak6] = useState<boolean>(false);
  const [senderOldestFrame6, setSenderOldestFrame6] = useState<number>(8);
  const [senderAckExpected6, setSenderAckExpected6] = useState<number>(0);
  const [senderNextFrameToSend6, setSenderNextFrameToSend6] = useState<number>(0);
  const [senderFrameExpected6, setSenderFrameExpected6] = useState<number>(0);
  const [senderTooFar6, setSenderTooFar6] = useState<number>(0);
  const [senderI6, setSenderI6] = useState<number>(0);
  const [senderR6, setSenderR6] = useState<Frame>(new Frame());
  const [senderOutBuf6, setSenderOutBuf6] = useState<Packet[]>(() => {
    let result = [];
    for (let i = 0; i < NR_BUFS; i++) {
      result.push(new Packet());
    }
    return result;
  });
  const [senderInBuf6, setSenderInBuf6] = useState<Packet[]>(() => {
    let result = [];
    for (let i = 0; i < NR_BUFS; i++) {
      result.push(new Packet());
    }
    return result;
  });
  const [senderArrived6, setSenderArrived6] = useState<boolean[]>(() => {
    let result = [];
    for (let i = 0; i < NR_BUFS; i++) {
      result.push(false);
    }
    return result;
  });
  const [senderNBuffered6, setSenderNBuffered6] = useState<number>(0);
  const [senderEvent6, setSenderEvent6] = useState<Event | undefined>();
  const senderCode6 = `
  #define MAX_SEQ 7 /* should be 2^n - 1*/
  #define NR_BUFS ((MAX_SEQ + 1) / 2)
  boolean no_nak = true;             /* no nak has been sent yet */
  seq_nr oldest_frame = MAX_SEQ + 1; /* initial value is only for the simulator */
  static boolean between(seq_nr a, seq_nr b, seq_nr c) {
    /* Same as between in protocol 5, but shorter and more obscure. */
    return ((a <= b) && (b < c) || ((c < a) && (a <= b)) || ((b < c) && (c < a)));
  }
  
  static void send_frame(frame_kind fk, seq_nr frame_nr, seq_nr frame_expected,
                         packet buffer[]) {
    /* Construct and send a data, ack or nak frame. */
    frame s;     /* scratch variable */
    s.kind = fk; /* kind == data, ack, or nak */
    if (fk == data)
      s.info = buffer[frame_nr % NR_BUFS];
    s.seq = frame_nr; /* only meaningful for data frames */
    s.ack = (frame_expected + MAX_SEQ) % (MAX_SEQ + 1);
    if (fk == nak) /* one nak per frame, please */
      no_nak = false;
    to_physical_layer(&s); /* transmit the frame */
    if (fk == data)
      start_timer(frame_nr % NR_BUFS);
    stop_ack_timer(); /* no need for separate ack frame */
  }
  
  void protocol6(void) {
    seq_nr ack_expected;       /* lower edge of sender's window */
    seq_nr next_frame_to_send; /* upper edge of sender's window + 1 */
    seq_nr frame_expected;     /* lower edge of receiver's window */
    seq_nr too_far;            /* upper edge of receiver's window + 1 */
    int i;                     /* index into buffer pool */
    frame r;                   /* scratch variable */
    packet out_buf[NR_BUFS];   /* buffers for the outbound stream */
    packet in_buf[NR_BUFS];    /* buffers for the inbound stream */
    boolean arrived[NR_BUFS];  /* inbound bit map */
    seq_nr nbuffered;          /* how many output buffers currently used */
    event_type event;
    enable_network_layer(); /* initialize */
    ack_expected = 0;       /* next ack expected on the inbound stream */
    too_far = NR_BUFS;
    nbuffered = 0; /* initially no packets are buffered */
    for (i = 0; i < NR_BUFS; i++)
      arrived[i] = false;
    while (true) {
      wait_for_event(&event); /* five possibilities: see event_type above */
      switch (event) {
      case network_layer_ready:    /* accept, save, and transmit a new frame */
        nbuffered = nbuffered + 1; /* expand the window */
        from_network_layer(
            &out_buf[next_frame_to_send % NR_BUFS]); /* fetch new packet */
        send_frame(data, next_frame_to_send, frame_expected,
                   out_buf);     /* transmit the frame */
        inc(next_frame_to_send); /* advance upper window edge */
        break;
  
      case frame_arrival:        /* a data or control frame has arrived */
        from_physical_layer(&r); /* fetch incoming frame from physical layer */
        if (r.kind == data) {
          /* An undamaged frame has arrived. */
          if ((r.seq != frame_expected) && no_nak)
            send_frame(nak, 0, frame_expected, out_buf);
          else
            start_ack_timer();
          if (between(frame_expected, r.seq, too_far) &&
              arrived[r.seq % NR_BUFS] == false) {
            /* Frames may be accepted in any order. */
            arrived[r.seq % NR_BUFS] = true;  /* mark buffer as full */
            in_buf[r.seq % NR_BUFS] = r.info; /* insert data into buffer */
            while (arrived[frame_expected % NR_BUFS]) {
              /* Pass frames and advance window. */
              to_network_layer(&in_buf[frame_expected % NR_BUFS]);
              no_nak = true;
              arrived[frame_expected % NR_BUFS] = false;
              inc(frame_expected); /* advance lower edge of receiver's window */
              inc(too_far);        /* advance upper edge of receiver's window */
              start_ack_timer();   /* to see if a separate ack is needed */
            }
          }
        }
        if ((r.kind == nak) && between(ack_expected, (r.ack + 1) % (MAX_SEQ + 1),
                                       next_frame_to_send))
          send_frame(data, (r.ack + 1) % (MAX_SEQ + 1), frame_expected, out_buf);
        while (between(ack_expected, r.ack, next_frame_to_send)) {
          nbuffered = nbuffered - 1;          /* handle piggybacked ack */
          stop_timer(ack_expected % NR_BUFS); /* frame arrived intact */
          inc(ack_expected); /* advance lower edge of sender's window */
        }
        break;
  
      case cksum_err:
        if (no_nak)
          send_frame(nak, 0, frame_expected, out_buf); /* damaged frame*/
        break;
  
      case timeout:
        send_frame(data, oldest_frame, frame_expected,
                   out_buf); /* we timed out */
        break;
  
      case ack_timeout:
        send_frame(ack, 0, frame_expected,
                   out_buf); /* ack timer expired; send ack */
      }
      if (nbuffered < NR_BUFS)
        enable_network_layer();
      else
        disable_network_layer();
    }
  }`;

  const stepSender6 = useCallback((state: ViewerState) => {
    const row = state.senderRow;
    const setRow = state.setSenderRow;
    const networkToDataLink = state.senderNetworkToDataLink;
    const setNetworkToDataLink = state.setSenderNetworkToDataLink;
    const dataLinkToPhysical = state.senderDataLinkToPhysical;
    const setDataLinkToPhysical = state.setSenderDataLinkToPhysical;
    const dataLinkToNetwork = state.senderDataLinkToNetwork;
    const setDataLinkToNetwork = state.setSenderDataLinkToNetwork;
    const physicalToDataLink = state.senderPhysicalToDataLink;
    const setPhysicalToDataLink = state.setSenderPhysicalToDataLink;
    const dataLinkEvent = state.senderDataLinkEvent;
    const setDataLinkEvent = state.setSenderDataLinkEvent;
    const enableNetworkLayer = state.senderEnableNetworkLayer;
    const disableNetworkLayer = state.senderDisableNetworkLayer;
    const nBuffered = senderNBuffered6;
    const setNBuffered = setSenderNBuffered6;
    const r = senderR6;
    const setR = setSenderR6;
    const i = senderI6;
    const setI = setSenderI6;
    const tooFar = senderTooFar6;
    const setTooFar = setSenderTooFar6;
    const noNak = senderNoNak6;
    const setNoNak = setSenderNoNak6;
    const arrived = senderArrived6;
    const setArrived = setSenderArrived6;
    const inBuf = senderInBuf6;
    const setInBuf = setSenderInBuf6;
    const outBuf = senderOutBuf6;
    const setOutBuf = setSenderOutBuf6;
    const event = senderEvent6;
    const setEvent = setSenderEvent6;
    const nextFrameToSend = senderNextFrameToSend6;
    const setNextFrameToSend = setSenderNextFrameToSend6;
    const oldestFrame = senderOldestFrame6;
    const setOldestFrame6 = setSenderOldestFrame6;
    const frameExpected = senderFrameExpected6;
    const setFrameExpected = setSenderFrameExpected6;
    const ackExpected = senderAckExpected6;
    const setAckExpected = setSenderAckExpected6;

    if (row === 38) {
      // enable_network_layer();
      enableNetworkLayer();
      setRow(39);
    } else if (row === 39) {
      // ack_expected = 0;
      setAckExpected(0);
      setRow(40);
    } else if (row === 40) {
      // too_far = NR_BUFS;
      setTooFar(NR_BUFS);
      setRow(41);
    } else if (row === 41) {
      // nbuffered = 0;
      setNBuffered(0);
      setRow(42);
    } else if (row === 42) {
      // for (i = 0; i < NR_BUFS; i++)
      let arrived = [];
      for (let i = 0; i < NR_BUFS; i++) {
        arrived.push(false);
      }
      setArrived(arrived);
      setI(NR_BUFS);
      setRow(44);
    } else if (row === 44) {
      // while (true) {
      setRow(45);
    } else if (row === 45 && dataLinkEvent.length > 0) {
      // wait_for_event(&event);
      setEvent(dataLinkEvent[0]);
      setDataLinkEvent(dataLinkEvent.slice(1));
      setRow(46);
    } else if (row === 46) {
      // switch (event) {
      if (event === Event.NetworkLayerReady) {
        setRow(48);
      } else if (event === Event.FrameArrival) {
        setRow(57);
      } else if (event === Event.CksumError) {
        setRow(91);
      } else if (event === Event.Timeout) {
        setRow(96);
      } else if (event === Event.AckTimeout) {
        setRow(101);
      } else {
        setRow(103);
      }
    } else if (row === 48) {
      // nbuffered = nbuffered + 1;
      setNBuffered(nBuffered + 1);
      setRow(49);
    } else if (row === 49 && networkToDataLink.length > 0) {
      // from_network_layer(
      //     &out_buf[next_frame_to_send % NR_BUFS]);
      let newOutBuf = [...outBuf];
      newOutBuf[nextFrameToSend % NR_BUFS] = networkToDataLink[0];
      setOutBuf(newOutBuf);
      setNetworkToDataLink(networkToDataLink.slice(1));
      setRow(51);
    } else if (row === 51) {
      // send_frame(data, next_frame_to_send, frame_expected,
      //            out_buf); 
      let s = new Frame();
      s.kind = FrameKind.Data;
      s.info = outBuf[nextFrameToSend % NR_BUFS];
      s.seq = nextFrameToSend;
      s.ack = (frameExpected + MAX_SEQ) % (MAX_SEQ + 1);
      setDataLinkToPhysical(dataLinkToPhysical.concat([s]));
      setRow(53);
    } else if (row === 53) {
      // inc(next_frame_to_send);
      setNextFrameToSend((nextFrameToSend + 1) % (MAX_SEQ + 1));
      setRow(54);
    } else if (row === 54) {
      // break;
      setRow(103);
    } else if (row === 57 && physicalToDataLink.length > 0) {
      // from_physical_layer(&r);
      setR(physicalToDataLink[0]);
      setPhysicalToDataLink(physicalToDataLink.slice(1));
      setRow(58);
    } else if (row === 58) {
      // if (r.kind == data) {
      if (r.kind === FrameKind.Data) {
        setRow(60);
      } else {
        setRow(80);
      }
    } else if (row === 60) {
      // if ((r.seq != frame_expected) && no_nak)
      if ((r.seq !== frameExpected) && noNak) {
        setRow(61);
      } else {
        setRow(63);
      }
    } else if (row === 61) {
      // send_frame(nak, 0, frame_expected, out_buf);
      let s = new Frame();
      s.kind = FrameKind.Nak;
      s.seq = 0;
      s.ack = (frameExpected + MAX_SEQ) % (MAX_SEQ + 1);
      setNoNak(false);
      setDataLinkToPhysical(dataLinkToPhysical.concat([s]));
      setRow(64);
    } else if (row === 63) {
      // start_ack_timer();
      setRow(64);
    } else if (row === 64) {
      // if (between(frame_expected, r.seq, too_far) &&
      // arrived[r.seq % NR_BUFS] == false) {
      let a = ackExpected;
      let b = r.seq!;
      let c = tooFar;
      if ((((a <= b) && (b < c)) || ((c < a) && (a <= b)) || ((b < c) && (c < a)))
        && arrived[r.seq! % NR_BUFS] === false) {
        setRow(67);
      } else {
        setRow(78);
      }
    } else if (row === 67) {
      // arrived[r.seq % NR_BUFS] = true;
      let newArrived = [...arrived];
      newArrived[r.seq! % NR_BUFS] = true;
      setArrived(newArrived);
      setRow(68);
    } else if (row === 68) {
      // in_buf[r.seq % NR_BUFS] = r.info;
      let newInBuf = [...inBuf];
      newInBuf[r.seq! % NR_BUFS] = r.info!.clone();
      setInBuf(newInBuf);
      setRow(69);
    } else if (row === 69) {
      // while (arrived[frame_expected % NR_BUFS]) {
      if (arrived[frameExpected % NR_BUFS] === true) {
        setRow(71);
      } else {
        setRow(78);
      }
    } else if (row === 71) {
      // to_network_layer(&in_buf[frame_expected % NR_BUFS]);
      setDataLinkToNetwork(dataLinkToNetwork.concat([inBuf[frameExpected % NR_BUFS]]));
      setRow(72);
    } else if (row === 72) {
      // no_nak = true;
      setNoNak(true);
      setRow(73);
    } else if (row === 73) {
      // arrived[frame_expected % NR_BUFS] = false;
      let newArrived = [...arrived];
      newArrived[frameExpected % NR_BUFS] = false;
      setArrived(newArrived);
      setRow(74);
    } else if (row === 74) {
      // inc(frame_expected);
      setFrameExpected((frameExpected + 1) % (MAX_SEQ + 1));
      setRow(75);
    } else if (row === 75) {
      // inc(too_far);
      setTooFar((tooFar + 1) % (MAX_SEQ + 1));
      setRow(76);
    } else if (row === 76) {
      // start_ack_timer();
      setRow(77);
    } else if (row === 77) {
      // }
      setRow(69);
    } else if (row === 78) {
      // }
      setRow(79);
    } else if (row === 79) {
      // }
      setRow(80);
    } else if (row === 80) {
      // if ((r.kind == nak) && between(ack_expected, (r.ack + 1) % (MAX_SEQ + 1),
      // next_frame_to_send)) 
      let a = ackExpected;
      let b = (r.ack! + 1) % (MAX_SEQ + 1);
      let c = nextFrameToSend;
      if ((((a <= b) && (b < c)) || ((c < a) && (a <= b)) || ((b < c) && (c < a)))
        && r.kind === FrameKind.Nak) {
        setRow(82);
      } else {
        setRow(83);
      }
    } else if (row === 82) {
      // send_frame(data, (r.ack + 1) % (MAX_SEQ + 1), frame_expected, out_buf);
      let s = new Frame();
      s.kind = FrameKind.Data;
      s.info = outBuf[(r.ack! + 1) % (MAX_SEQ + 1) % NR_BUFS];
      s.seq = (r.ack! + 1) % (MAX_SEQ + 1);
      s.ack = (frameExpected + MAX_SEQ) % (MAX_SEQ + 1);
      setDataLinkToPhysical(dataLinkToPhysical.concat([s]));
      setRow(83);
    } else if (row === 83) {
      // while (between(ack_expected, r.ack, next_frame_to_send)) {
      let a = ackExpected;
      let b = r.ack!;
      let c = nextFrameToSend;
      if ((((a <= b) && (b < c)) || ((c < a) && (a <= b)) || ((b < c) && (c < a)))) {
        setRow(84);
      } else {
        setRow(88);
      }
    } else if (row === 84) {
      // nbuffered = nbuffered - 1;
      setNBuffered(nBuffered - 1);
      setRow(85);
    } else if (row === 85) {
      // stop_timer(ack_expected % NR_BUFS);
      setRow(86);
    } else if (row === 86) {
      // inc(ack_expected);
      setAckExpected((ackExpected + 1) % (MAX_SEQ + 1));
      setRow(87);
    } else if (row === 87) {
      // }
      setRow(83);
    } else if (row === 88) {
      // break;
      setRow(103);
    } else if (row === 91) {
      // if (no_nak)
      if (noNak === true) {
        setRow(92);
      } else {
        setRow(93);
      }
    } else if (row === 92) {
      // send_frame(nak, 0, frame_expected, out_buf);
      let s = new Frame();
      s.kind = FrameKind.Nak;
      s.seq = 0;
      s.ack = (frameExpected + MAX_SEQ) % (MAX_SEQ + 1);
      setNoNak(false);
      setDataLinkToPhysical(dataLinkToPhysical.concat([s]));
      setRow(93);
    } else if (row === 93) {
      // break;
      setRow(103);
    } else if (row === 96) {
      // send_frame(data, oldest_frame, frame_expected,
      // out_buf);
      let s = new Frame();
      s.kind = FrameKind.Data;
      s.info = outBuf[oldestFrame % NR_BUFS];
      s.seq = oldestFrame % (MAX_SEQ + 1);
      s.ack = (frameExpected + MAX_SEQ) % (MAX_SEQ + 1);
      setDataLinkToPhysical(dataLinkToPhysical.concat([s]));
      setRow(97);
    } else if (row === 97) {
      // break;
      setRow(103);
    } else if (row === 101) {
      // send_frame(ack, 0, frame_expected,
      // out_buf);
      let s = new Frame();
      s.kind = FrameKind.Ack;
      s.seq = 0;
      s.ack = (frameExpected + MAX_SEQ) % (MAX_SEQ + 1);
      setDataLinkToPhysical(dataLinkToPhysical.concat([s]));
      setRow(103);
    } else if (row === 103) {
      // }
      setRow(104);
    } else if (row === 104) {
      // if (nbuffered < NR_BUFS)
      if (nBuffered < NR_BUFS) {
        setRow(105);
      } else {
        setRow(107);
      }
    } else if (row === 105) {
      // enable_network_layer();
      enableNetworkLayer();
      setRow(108);
    } else if (row === 107) {
      // disable_network_layer();
      disableNetworkLayer();
      setRow(108);
    } else if (row === 108) {
      setRow(44);
    }
  }, [senderNoNak6, senderOldestFrame6, senderAckExpected6, senderNextFrameToSend6, senderFrameExpected6, senderTooFar6, senderI6, senderR6, senderOutBuf6, senderInBuf6, senderArrived6, senderNBuffered6, senderEvent6]);

  const canStepSender6 = useCallback((state: ViewerState) => {
    const row = state.senderRow;
    const networkToDataLink = state.senderNetworkToDataLink;
    const dataLinkEvent = state.senderDataLinkEvent;
    const physicalToDataLink = state.senderPhysicalToDataLink;

    if (row === 45 && dataLinkEvent.length === 0) {
      // wait_for_event(&event);
      return STALL_WAIT_FOR_EVENT;
    } else if (row === 49 && networkToDataLink.length === 0) {
      // from_network_layer(
      //     &out_buf[next_frame_to_send % NR_BUFS]);
      return STALL_FROM_NETWORK_LAYER;
    } else if (row === 57 && physicalToDataLink.length === 0) {
      // from_physical_layer(&r);
      return STALL_FROM_PHYSICAL_LAYER;
    } else {
      return undefined;
    }
  }, []);

  const [receiverNoNak6, setReceiverNoNak6] = useState<boolean>(false);
  const [receiverOldestFrame6, setReceiverOldestFrame6] = useState<number>(8);
  const [receiverAckExpected6, setReceiverAckExpected6] = useState<number>(0);
  const [receiverNextFrameToSend6, setReceiverNextFrameToSend6] = useState<number>(0);
  const [receiverFrameExpected6, setReceiverFrameExpected6] = useState<number>(0);
  const [receiverTooFar6, setReceiverTooFar6] = useState<number>(0);
  const [receiverI6, setReceiverI6] = useState<number>(0);
  const [receiverR6, setReceiverR6] = useState<Frame>(new Frame());
  const [receiverOutBuf6, setReceiverOutBuf6] = useState<Packet[]>(() => {
    let result = [];
    for (let i = 0; i < NR_BUFS; i++) {
      result.push(new Packet());
    }
    return result;
  });
  const [receiverInBuf6, setReceiverInBuf6] = useState<Packet[]>(() => {
    let result = [];
    for (let i = 0; i < NR_BUFS; i++) {
      result.push(new Packet());
    }
    return result;
  });
  const [receiverArrived6, setReceiverArrived6] = useState<boolean[]>(() => {
    let result = [];
    for (let i = 0; i < NR_BUFS; i++) {
      result.push(false);
    }
    return result;
  });
  const [receiverNBuffered6, setReceiverNBuffered6] = useState<number>(0);
  const [receiverEvent6, setReceiverEvent6] = useState<Event | undefined>();
  const receiverCode6 = senderCode6;

  const stepReceiver6 = useCallback((state: ViewerState) => {
    const row = state.receiverRow;
    const setRow = state.setReceiverRow;
    const networkToDataLink = state.receiverNetworkToDataLink;
    const setNetworkToDataLink = state.setReceiverNetworkToDataLink;
    const dataLinkToPhysical = state.receiverDataLinkToPhysical;
    const setDataLinkToPhysical = state.setReceiverDataLinkToPhysical;
    const dataLinkToNetwork = state.receiverDataLinkToNetwork;
    const setDataLinkToNetwork = state.setReceiverDataLinkToNetwork;
    const physicalToDataLink = state.receiverPhysicalToDataLink;
    const setPhysicalToDataLink = state.setReceiverPhysicalToDataLink;
    const dataLinkEvent = state.receiverDataLinkEvent;
    const setDataLinkEvent = state.setReceiverDataLinkEvent;
    const enableNetworkLayer = state.receiverEnableNetworkLayer;
    const disableNetworkLayer = state.receiverDisableNetworkLayer;
    const nBuffered = receiverNBuffered6;
    const setNBuffered = setReceiverNBuffered6;
    const r = receiverR6;
    const setR = setReceiverR6;
    const i = receiverI6;
    const setI = setReceiverI6;
    const tooFar = receiverTooFar6;
    const setTooFar = setReceiverTooFar6;
    const noNak = receiverNoNak6;
    const setNoNak = setReceiverNoNak6;
    const arrived = receiverArrived6;
    const setArrived = setReceiverArrived6;
    const inBuf = receiverInBuf6;
    const setInBuf = setReceiverInBuf6;
    const outBuf = receiverOutBuf6;
    const setOutBuf = setReceiverOutBuf6;
    const event = receiverEvent6;
    const setEvent = setReceiverEvent6;
    const nextFrameToSend = receiverNextFrameToSend6;
    const setNextFrameToSend = setReceiverNextFrameToSend6;
    const oldestFrame = receiverOldestFrame6;
    const setOldestFrame6 = setReceiverOldestFrame6;
    const frameExpected = receiverFrameExpected6;
    const setFrameExpected = setReceiverFrameExpected6;
    const ackExpected = receiverAckExpected6;
    const setAckExpected = setReceiverAckExpected6;

    if (row === 38) {
      // enable_network_layer();
      enableNetworkLayer();
      setRow(39);
    } else if (row === 39) {
      // ack_expected = 0;
      setAckExpected(0);
      setRow(40);
    } else if (row === 40) {
      // too_far = NR_BUFS;
      setTooFar(NR_BUFS);
      setRow(41);
    } else if (row === 41) {
      // nbuffered = 0;
      setNBuffered(0);
      setRow(42);
    } else if (row === 42) {
      // for (i = 0; i < NR_BUFS; i++)
      let arrived = [];
      for (let i = 0; i < NR_BUFS; i++) {
        arrived.push(false);
      }
      setArrived(arrived);
      setI(NR_BUFS);
      setRow(44);
    } else if (row === 44) {
      // while (true) {
      setRow(45);
    } else if (row === 45 && dataLinkEvent.length > 0) {
      // wait_for_event(&event);
      setEvent(dataLinkEvent[0]);
      setDataLinkEvent(dataLinkEvent.slice(1));
      setRow(46);
    } else if (row === 46) {
      // switch (event) {
      if (event === Event.NetworkLayerReady) {
        setRow(48);
      } else if (event === Event.FrameArrival) {
        setRow(57);
      } else if (event === Event.CksumError) {
        setRow(91);
      } else if (event === Event.Timeout) {
        setRow(96);
      } else if (event === Event.AckTimeout) {
        setRow(101);
      } else {
        setRow(103);
      }
    } else if (row === 48) {
      // nbuffered = nbuffered + 1;
      setNBuffered(nBuffered + 1);
      setRow(49);
    } else if (row === 49 && networkToDataLink.length > 0) {
      // from_network_layer(
      //     &out_buf[next_frame_to_send % NR_BUFS]);
      let newOutBuf = [...outBuf];
      newOutBuf[nextFrameToSend % NR_BUFS] = networkToDataLink[0];
      setOutBuf(newOutBuf);
      setNetworkToDataLink(networkToDataLink.slice(1));
      setRow(51);
    } else if (row === 51) {
      // send_frame(data, next_frame_to_send, frame_expected,
      //            out_buf); 
      let s = new Frame();
      s.kind = FrameKind.Data;
      s.info = outBuf[nextFrameToSend % NR_BUFS];
      s.seq = nextFrameToSend;
      s.ack = (frameExpected + MAX_SEQ) % (MAX_SEQ + 1);
      setDataLinkToPhysical(dataLinkToPhysical.concat([s]));
      setRow(53);
    } else if (row === 53) {
      // inc(next_frame_to_send);
      setNextFrameToSend((nextFrameToSend + 1) % (MAX_SEQ + 1));
      setRow(54);
    } else if (row === 54) {
      // break;
      setRow(103);
    } else if (row === 57 && physicalToDataLink.length > 0) {
      // from_physical_layer(&r);
      setR(physicalToDataLink[0]);
      setPhysicalToDataLink(physicalToDataLink.slice(1));
      setRow(58);
    } else if (row === 58) {
      // if (r.kind == data) {
      if (r.kind === FrameKind.Data) {
        setRow(60);
      } else {
        setRow(80);
      }
    } else if (row === 60) {
      // if ((r.seq != frame_expected) && no_nak)
      if ((r.seq !== frameExpected) && noNak) {
        setRow(61);
      } else {
        setRow(63);
      }
    } else if (row === 61) {
      // send_frame(nak, 0, frame_expected, out_buf);
      let s = new Frame();
      s.kind = FrameKind.Nak;
      s.seq = 0;
      s.ack = (frameExpected + MAX_SEQ) % (MAX_SEQ + 1);
      setNoNak(false);
      setDataLinkToPhysical(dataLinkToPhysical.concat([s]));
      setRow(64);
    } else if (row === 63) {
      // start_ack_timer();
      setRow(64);
    } else if (row === 64) {
      // if (between(frame_expected, r.seq, too_far) &&
      // arrived[r.seq % NR_BUFS] == false) {
      let a = ackExpected;
      let b = r.seq!;
      let c = tooFar;
      if ((((a <= b) && (b < c)) || ((c < a) && (a <= b)) || ((b < c) && (c < a)))
        && arrived[r.seq! % NR_BUFS] === false) {
        setRow(67);
      } else {
        setRow(78);
      }
    } else if (row === 67) {
      // arrived[r.seq % NR_BUFS] = true;
      let newArrived = [...arrived];
      newArrived[r.seq! % NR_BUFS] = true;
      setArrived(newArrived);
      setRow(68);
    } else if (row === 68) {
      // in_buf[r.seq % NR_BUFS] = r.info;
      let newInBuf = [...inBuf];
      newInBuf[r.seq! % NR_BUFS] = r.info!.clone();
      setInBuf(newInBuf);
      setRow(69);
    } else if (row === 69) {
      // while (arrived[frame_expected % NR_BUFS]) {
      if (arrived[frameExpected % NR_BUFS] === true) {
        setRow(71);
      } else {
        setRow(78);
      }
    } else if (row === 71) {
      // to_network_layer(&in_buf[frame_expected % NR_BUFS]);
      setDataLinkToNetwork(dataLinkToNetwork.concat([inBuf[frameExpected % NR_BUFS]]));
      setRow(72);
    } else if (row === 72) {
      // no_nak = true;
      setNoNak(true);
      setRow(73);
    } else if (row === 73) {
      // arrived[frame_expected % NR_BUFS] = false;
      let newArrived = [...arrived];
      newArrived[frameExpected % NR_BUFS] = false;
      setArrived(newArrived);
      setRow(74);
    } else if (row === 74) {
      // inc(frame_expected);
      setFrameExpected((frameExpected + 1) % (MAX_SEQ + 1));
      setRow(75);
    } else if (row === 75) {
      // inc(too_far);
      setTooFar((tooFar + 1) % (MAX_SEQ + 1));
      setRow(76);
    } else if (row === 76) {
      // start_ack_timer();
      setRow(77);
    } else if (row === 77) {
      // }
      setRow(69);
    } else if (row === 78) {
      // }
      setRow(79);
    } else if (row === 79) {
      // }
      setRow(80);
    } else if (row === 80) {
      // if ((r.kind == nak) && between(ack_expected, (r.ack + 1) % (MAX_SEQ + 1),
      // next_frame_to_send)) 
      let a = ackExpected;
      let b = (r.ack! + 1) % (MAX_SEQ + 1);
      let c = nextFrameToSend;
      if ((((a <= b) && (b < c)) || ((c < a) && (a <= b)) || ((b < c) && (c < a)))
        && r.kind === FrameKind.Nak) {
        setRow(82);
      } else {
        setRow(83);
      }
    } else if (row === 82) {
      // send_frame(data, (r.ack + 1) % (MAX_SEQ + 1), frame_expected, out_buf);
      let s = new Frame();
      s.kind = FrameKind.Data;
      s.info = outBuf[(r.ack! + 1) % (MAX_SEQ + 1) % NR_BUFS];
      s.seq = (r.ack! + 1) % (MAX_SEQ + 1);
      s.ack = (frameExpected + MAX_SEQ) % (MAX_SEQ + 1);
      setDataLinkToPhysical(dataLinkToPhysical.concat([s]));
      setRow(83);
    } else if (row === 83) {
      // while (between(ack_expected, r.ack, next_frame_to_send)) {
      let a = ackExpected;
      let b = r.ack!;
      let c = nextFrameToSend;
      if ((((a <= b) && (b < c)) || ((c < a) && (a <= b)) || ((b < c) && (c < a)))) {
        setRow(84);
      } else {
        setRow(88);
      }
    } else if (row === 84) {
      // nbuffered = nbuffered - 1;
      setNBuffered(nBuffered - 1);
      setRow(85);
    } else if (row === 85) {
      // stop_timer(ack_expected % NR_BUFS);
      setRow(86);
    } else if (row === 86) {
      // inc(ack_expected);
      setAckExpected((ackExpected + 1) % (MAX_SEQ + 1));
      setRow(87);
    } else if (row === 87) {
      // }
      setRow(83);
    } else if (row === 88) {
      // break;
      setRow(103);
    } else if (row === 91) {
      // if (no_nak)
      if (noNak === true) {
        setRow(92);
      } else {
        setRow(93);
      }
    } else if (row === 92) {
      // send_frame(nak, 0, frame_expected, out_buf);
      let s = new Frame();
      s.kind = FrameKind.Nak;
      s.seq = 0;
      s.ack = (frameExpected + MAX_SEQ) % (MAX_SEQ + 1);
      setNoNak(false);
      setDataLinkToPhysical(dataLinkToPhysical.concat([s]));
      setRow(93);
    } else if (row === 93) {
      // break;
      setRow(103);
    } else if (row === 96) {
      // send_frame(data, oldest_frame, frame_expected,
      // out_buf);
      let s = new Frame();
      s.kind = FrameKind.Data;
      s.info = outBuf[oldestFrame % NR_BUFS];
      s.seq = oldestFrame % (MAX_SEQ + 1);
      s.ack = (frameExpected + MAX_SEQ) % (MAX_SEQ + 1);
      setDataLinkToPhysical(dataLinkToPhysical.concat([s]));
      setRow(97);
    } else if (row === 97) {
      // break;
      setRow(103);
    } else if (row === 101) {
      // send_frame(ack, 0, frame_expected,
      // out_buf);
      let s = new Frame();
      s.kind = FrameKind.Ack;
      s.seq = 0;
      s.ack = (frameExpected + MAX_SEQ) % (MAX_SEQ + 1);
      setDataLinkToPhysical(dataLinkToPhysical.concat([s]));
      setRow(103);
    } else if (row === 103) {
      // }
      setRow(104);
    } else if (row === 104) {
      // if (nbuffered < NR_BUFS)
      if (nBuffered < NR_BUFS) {
        setRow(105);
      } else {
        setRow(107);
      }
    } else if (row === 105) {
      // enable_network_layer();
      enableNetworkLayer();
      setRow(108);
    } else if (row === 107) {
      // disable_network_layer();
      disableNetworkLayer();
      setRow(108);
    } else if (row === 108) {
      setRow(44);
    }
  }, [receiverNoNak6, receiverOldestFrame6, receiverAckExpected6, receiverNextFrameToSend6, receiverFrameExpected6, receiverTooFar6, receiverI6, receiverR6, receiverOutBuf6, receiverInBuf6, receiverArrived6, receiverNBuffered6, receiverEvent6]);

  const canStepReceiver6 = useCallback((state: ViewerState) => {
    const row = state.receiverRow;
    const networkToDataLink = state.receiverNetworkToDataLink;
    const dataLinkEvent = state.receiverDataLinkEvent;
    const physicalToDataLink = state.receiverPhysicalToDataLink;

    if (row === 45 && dataLinkEvent.length === 0) {
      // wait_for_event(&event);
      return STALL_WAIT_FOR_EVENT;
    } else if (row === 49 && networkToDataLink.length === 0) {
      // from_network_layer(
      //     &out_buf[next_frame_to_send % NR_BUFS]);
      return STALL_FROM_NETWORK_LAYER;
    } else if (row === 57 && physicalToDataLink.length === 0) {
      // from_physical_layer(&r);
      return STALL_FROM_PHYSICAL_LAYER;
    } else {
      return undefined;
    }
  }, []);

  return <Box>
    <Grid item xs={12}>
      <Paper sx={{
        padding: '30px',
      }}>
        <Typography variant="h4">
          协议六：选择重传协议（Selective repeat） Protocol 6 (Selective repeat)
        </Typography>
        <Typography>
          协议六允许 frame 乱序传输，但是在传递给网络层的时候是按顺序的。每个发送出去的 frame 都对应了一个 timer。当 timer 超时的时候，只有对应的 frame 会被重新传输，而不像协议五那样，全部重新传输。Protocol 6 (Selective repeat) accepts frames out of order but passes packets to the network layer in order. Associated with each outstanding frame is a timer. When the timer expires, only that frame is retransmitted, not all the outstanding frames, as in protocol 5. 
        </Typography>
      </Paper>
    </Grid>
    <Viewer
      initialSenderRow={38} senderCode={senderCode6}
      stepSender={stepSender6} canStepSender={canStepSender6}
      senderLocals={
        [
          `no_nak: ${senderNoNak6}`,
          `oldest_frame: ${senderOldestFrame6}`,
          `ack_expected: ${senderAckExpected6}`,
          `next_frame_to_send: ${senderNextFrameToSend6}`,
          `frame_expected: ${senderFrameExpected6}`,
          `too_far: ${senderTooFar6}`,
          `i: ${senderI6}`,
          `r: ${senderR6}`,
          `out_buf: ${senderOutBuf6}`,
          `in_buf: ${senderInBuf6}`,
          `arrived: ${senderArrived6}`,
          `nbuffered: ${senderNBuffered6}`,
          `event: ${senderEvent6}`]
      }
      initialReceiverRow={38} receiverCode={receiverCode6}
      stepReceiver={stepReceiver6} canStepReceiver={canStepReceiver6}
      receiverLocals={
        [
          `no_nak: ${receiverNoNak6}`,
          `oldest_frame: ${receiverOldestFrame6}`,
          `ack_expected: ${receiverAckExpected6}`,
          `next_frame_to_send: ${receiverNextFrameToSend6}`,
          `frame_expected: ${receiverFrameExpected6}`,
          `too_far: ${receiverTooFar6}`,
          `i: ${receiverI6}`,
          `r: ${receiverR6}`,
          `out_buf: ${receiverOutBuf6}`,
          `in_buf: ${receiverInBuf6}`,
          `arrived: ${receiverArrived6}`,
          `nbuffered: ${receiverNBuffered6}`,
          `event: ${receiverEvent6}`]
      }
    ></Viewer>
  </Box>;
}

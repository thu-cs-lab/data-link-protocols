import { useCallback, useState } from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { Viewer, ViewerState } from './Viewer';
import { Frame, Packet, Event, STALL_FROM_NETWORK_LAYER, STALL_FROM_PHYSICAL_LAYER, STALL_WAIT_FOR_EVENT, FrameKind, EventType } from './Common';

const MAX_SEQ = 7;
const NR_BUFS = (MAX_SEQ + 1) / 2;

function Protocol() {
  const [noNak, setNoNak] = useState<boolean>(false);
  const [oldestFrame, setOldestFrame] = useState<number>(MAX_SEQ + 1);
  const [ackExpected, setAckExpected] = useState<number>(0);
  const [nextFrameToSend, setNextFrameToSend] = useState<number>(0);
  const [frameExpected, setFrameExpected] = useState<number>(0);
  const [tooFar, setTooFar] = useState<number>(0);
  const [i, setI] = useState<number>(0);
  const [r, setR] = useState<Frame>(new Frame());
  const [outBuf, setOutBuf] = useState<Packet[]>(() => {
    let result = [];
    for (let i = 0; i < NR_BUFS; i++) {
      result.push(new Packet());
    }
    return result;
  });
  const [inBuf, setInBuf] = useState<Packet[]>(() => {
    let result = [];
    for (let i = 0; i < NR_BUFS; i++) {
      result.push(new Packet());
    }
    return result;
  });
  const [arrived, setArrived] = useState<boolean[]>(() => {
    let result = [];
    for (let i = 0; i < NR_BUFS; i++) {
      result.push(false);
    }
    return result;
  });
  const [nBuffered, setNBuffered] = useState<number>(0);
  const [event, setEvent] = useState<EventType | undefined>();
  const code = `
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

  const step = useCallback((state: ViewerState) => {
    const { row, setRow, dataLinkEvent, setDataLinkEvent, dataLinkToPhysical, setDataLinkToPhysical, physicalToDataLink, setPhysicalToDataLink, dataLinkToNetwork, setDataLinkToNetwork, enableNetworkLayer, disableNetworkLayer, networkToDataLink, setNetworkToDataLink } = state;

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
      if (Array.isArray(dataLinkEvent[0])) {
        // handle timeout with frame number
        setOldestFrame(dataLinkEvent[0][1]);
        setEvent(dataLinkEvent[0][0]);
      } else {
        setEvent(dataLinkEvent[0]);
      }
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
  }, [noNak, oldestFrame, ackExpected, nextFrameToSend, frameExpected, tooFar, r, outBuf, inBuf, arrived, nBuffered, event]);

  const canStep = useCallback((state: ViewerState) => {
    const { row, dataLinkEvent, physicalToDataLink, networkToDataLink } = state;

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

  return {
    initialRow: 38,
    code: code,
    step: step,
    canStep: canStep,
    locals:
      [
        `no_nak: ${noNak}`,
        `oldest_frame: ${oldestFrame}`,
        `ack_expected: ${ackExpected}`,
        `next_frame_to_send: ${nextFrameToSend}`,
        `frame_expected: ${frameExpected}`,
        `too_far: ${tooFar}`,
        `i: ${i}`,
        `r: ${r}`,
        `out_buf: ${outBuf}`,
        `in_buf: ${inBuf}`,
        `arrived: ${arrived}`,
        `nbuffered: ${nBuffered}`,
        `event: ${event}`
      ]
  }
}

export function Protocol6() {
  const {
    initialRow: initialSenderRow,
    code: senderCode,
    step: stepSender,
    canStep: canStepSender,
    locals: senderLocals
  } = Protocol();

  const {
    initialRow: initialReceiverRow,
    code: receiverCode,
    step: stepReceiver,
    canStep: canStepReceiver,
    locals: receiverLocals
  } = Protocol();

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
      initialSenderRow={initialSenderRow} senderCode={senderCode}
      stepSender={stepSender} canStepSender={canStepSender}
      senderLocals={senderLocals}
      initialReceiverRow={initialReceiverRow} receiverCode={receiverCode}
      stepReceiver={stepReceiver} canStepReceiver={canStepReceiver}
      receiverLocals={receiverLocals}
      addOldestFrameToTimeoutEvent={true}
    ></Viewer>
  </Box>;
}

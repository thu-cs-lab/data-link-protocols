import { useCallback, useState } from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { Viewer, ViewerState } from './Viewer';
import { Frame, Packet, Event, STALL_FROM_NETWORK_LAYER, STALL_FROM_PHYSICAL_LAYER, STALL_WAIT_FOR_EVENT, EventType } from './Common';

const MAX_SEQ = 7;

function Protocol() {
  const [nextFrameToSend, setNextFrameToSend] = useState<number>(0);
  const [ackExpected, setAckExpected] = useState<number>(0);
  const [frameExpected, setFrameExpected] = useState<number>(0);
  const [r, setR] = useState<Frame>(new Frame());
  const [buffer, setBuffer] = useState<Packet[]>(() => {
    let result = [];
    for (let i = 0; i < MAX_SEQ + 1; i++) {
      result.push(new Packet());
    }
    return result;
  });
  const [nBuffered, setNBuffered] = useState<number>(0);
  const [i, setI] = useState<number>(0);
  const [event, setEvent] = useState<EventType | undefined>();
  const code = `
  #define MAX_SEQ 7
  static boolean between(seq_nr a, seq_nr b, seq_nr c) {
    /* Return true if a <= b < c circularly; false otherwise. */
    if (((a <= b) && (b < c) || ((c < a) && (a <= b)) || ((b < c) && (c < a))))
      return (true);
    else
      return (false);
  }
  
  static void send_data(seq_nr frame_nr, seq_nr frame_expected, packet buffer[]) {
    /* Construct and send a data frame. */
    frame s;                   /* scratch variable */
    s.info = buffer[frame_nr]; /* insert packet into frame */
    s.seq = frame_nr;          /* insert sequence number into frame */
    s.ack = (frame_expected + MAX_SEQ) % (MAX_SEQ + 1); /* piggyback ack */
    to_physical_layer(&s);                              /* transmit the frame */
    start_timer(frame_nr); /* start the timer running */
  }
  
  void protocol5(void) {
    seq_nr next_frame_to_send;  /* MAX_SEQ > 1; used for outbound stream */
    seq_nr ack_expected;        /* oldest frame as yet unacknowledged */
    seq_nr frame_expected;      /* next frame expected on inbound stream */
    frame r;                    /* scratch variable */
    packet buffer[MAX_SEQ + 1]; /* buffers for the outbound stream */
    seq_nr nbuffered;           /* number of output buffers currently in use */
    seq_nr i;                   /* used to index into the buffer array */
    event_type event;
    enable_network_layer(); /* allow network_layer_ready_events */
    ack_expected = 0;       /* next ack expected inbound */
    next_frame_to_send = 0; /* next frame going out */
    frame_expected = 0;     /* number of frame expected inbound */
    nbuffered = 0;          /* initially no packets are buffered */
    while (true) {
      wait_for_event(&event); /* four possibilities: see event_type above */
      switch (event) {
      case network_layer_ready: /* the network layer has a packet to send */
        /* Accept, save, and transmit a new frame. */
        from_network_layer(&buffer[next_frame_to_send]); /* fetch new packet */
        nbuffered = nbuffered + 1; /* expand the sender's window */
        send_data(next_frame_to_send, frame_expected,
                  buffer);       /* transmit the frame */
        inc(next_frame_to_send); /* advance sender's upper window edge */
        break;
  
      case frame_arrival:        /* a data or control frame has arrived */
        from_physical_layer(&r); /* get incoming frame from physical layer */
        if (r.seq == frame_expected) {
          /* Frames are accepted only in order*/
          to_network_layer(&r.info); /* pass packet the network layer */
          inc(frame_expected);       /* advance lower edge of receiver's window */
        }
        /* Ack n implies n - 1, n - 2, etc. Check for this. */
        while (between(ack_expected, r.ack, next_frame_to_send)) {
          /* Handle piggybacked ack. */
          nbuffered = nbuffered - 1; /* one frame fewer buffered */
          stop_timer(ack_expected);  /* frame arrived intact; stop timer */
          inc(ack_expected);         /* contract sender's window */
        }
        break;
  
      case cksum_err: /* just ignore bad frames */
        break;
  
      case timeout: /* trouble; retransmit all outstanding frames */
        next_frame_to_send = ack_expected; /* start retransmitting here */
        for (i = 1; i <= nbuffered; i++) {
          send_data(next_frame_to_send, frame_expected,
                    buffer);       /* resend frame */
          inc(next_frame_to_send); /* prepare to send the next one */
        }
      }
      if (nbuffered < MAX_SEQ)
        enable_network_layer();
      else
        disable_network_layer();
    }
  }`;

  const sendData = useCallback((state: ViewerState, frameNr: number, frameExpected: number, buffer: Packet[]) => {
    const { dataLinkToPhysical, setDataLinkToPhysical } = state;
    let s = new Frame();
    s.info = buffer[frameNr];
    s.seq = frameNr;
    s.ack = (frameExpected + MAX_SEQ) % (MAX_SEQ + 1);
    setDataLinkToPhysical(dataLinkToPhysical.concat([s]));
  }, []);

  const step = useCallback((state: ViewerState) => {
    const { row, setRow, dataLinkEvent, setDataLinkEvent, physicalToDataLink, setPhysicalToDataLink, dataLinkToNetwork, setDataLinkToNetwork, enableNetworkLayer, disableNetworkLayer, networkToDataLink, setNetworkToDataLink } = state;
    if (row === 28) {
      // enable_network_layer();
      enableNetworkLayer();
      setRow(29);
    } else if (row === 29) {
      // ack_expected = 0;
      setAckExpected(0);
      setRow(30);
    } else if (row === 30) {
      // next_frame_to_send = 0;
      setNextFrameToSend(0);
      setRow(31);
    } else if (row === 31) {
      // frame_expected = 0;
      setFrameExpected(0);
      setRow(32);
    } else if (row === 32) {
      // nbuffered = 0;
      setNBuffered(0);
      setRow(33);
    } else if (row === 33) {
      // while (true) {
      setRow(34);
    } else if (row === 34 && dataLinkEvent.length > 0) {
      // wait_for_event(&event);
      setEvent(dataLinkEvent[0]);
      setDataLinkEvent(dataLinkEvent.slice(1));
      setRow(35);
    } else if (row === 35) {
      // switch (event) {
      if (event === Event.NetworkLayerReady) {
        setRow(38);
      } else if (event === Event.FrameArrival) {
        setRow(47);
      } else if (event === Event.CksumError) {
        setRow(63);
      } else if (event === Event.Timeout) {
        setRow(66);
      } else {
        setRow(72);
      }
    } else if (row === 38 && networkToDataLink.length > 0) {
      // from_network_layer(&buffer[next_frame_to_send]);
      let newBuffer = [...buffer];
      newBuffer[nextFrameToSend] = networkToDataLink[0];
      setBuffer(newBuffer);
      setNetworkToDataLink(networkToDataLink.slice(1));
      setRow(39);
    } else if (row === 39) {
      // nbuffered = nbuffered + 1;
      setNBuffered(nBuffered + 1);
      setRow(40);
    } else if (row === 40) {
      // send_data(next_frame_to_send, frame_expected,
      // buffer);
      sendData(state, nextFrameToSend, frameExpected, buffer);
      setRow(42);
    } else if (row === 42) {
      // inc(next_frame_to_send);
      setNextFrameToSend((nextFrameToSend + 1) % (MAX_SEQ + 1));
      setRow(43);
    } else if (row === 43) {
      // break;
      setRow(72);
    } else if (row === 47 && physicalToDataLink.length > 0) {
      // from_physical_layer(&r);
      setR(physicalToDataLink[0]);
      setPhysicalToDataLink(physicalToDataLink.slice(1));
      setRow(48);
    } else if (row === 48) {
      // if (r.seq == frame_expected) {
      if (r.seq === frameExpected) {
        setRow(50);
      } else {
        setRow(52);
      }
    } else if (row === 50) {
      // to_network_layer(&r.info);
      setDataLinkToNetwork(dataLinkToNetwork.concat([r.info!]));
      setRow(51);
    } else if (row === 51) {
      // inc(frame_expected);
      setFrameExpected((frameExpected + 1) % (MAX_SEQ + 1));
      setRow(52);
    } else if (row === 52) {
      // }
      setRow(54);
    } else if (row === 54) {
      // while (between(ack_expected, r.ack, next_frame_to_send)) {
      let a = ackExpected;
      let b = r.ack!;
      let c = nextFrameToSend;
      if ((((a <= b) && (b < c)) || ((c < a) && (a <= b)) || ((b < c) && (c < a)))) {
        setRow(56);
      } else {
        setRow(60);
      }
    } else if (row === 56) {
      // nbuffered = nbuffered - 1;
      setNBuffered(nBuffered - 1);
      setRow(57);
    } else if (row === 57) {
      // stop_timer(ack_expected);
      setRow(58);
    } else if (row === 58) {
      // inc(ack_expected);
      setAckExpected((ackExpected + 1) % (MAX_SEQ + 1));
      setRow(59);
    } else if (row === 59) {
      // }
      setRow(54);
    } else if (row === 60) {
      // break;
      setRow(72);
    } else if (row === 63) {
      // break;
      setRow(72);
    } else if (row === 66) {
      // next_frame_to_send = ack_expected;
      setNextFrameToSend(ackExpected);
      setRow(67);
    } else if (row === 67) {
      // for (i = 1; i <= nbuffered; i++) {
      setI(1);
      if (i <= nBuffered) {
        setRow(68);
      } else {
        setRow(72);
      }
    } else if (row === 68) {
      // send_data(next_frame_to_send, frame_expected,
      // buffer);
      sendData(state, nextFrameToSend, frameExpected, buffer);
      setRow(70);
    } else if (row === 70) {
      // inc(next_frame_to_send);
      setNextFrameToSend((nextFrameToSend + 1) % (MAX_SEQ + 1));
      setRow(71);
    } else if (row === 71) {
      // }
      setI(i + 1);
      if (i + 1 <= nBuffered) {
        setRow(68);
      } else {
        setRow(72);
      }
    } else if (row === 72) {
      // }
      setRow(73);
    } else if (row === 73) {
      // if (nbuffered < MAX_SEQ)
      if (nBuffered < MAX_SEQ) {
        setRow(74);
      } else {
        setRow(76);
      }
    } else if (row === 74) {
      // enable_network_layer();
      enableNetworkLayer();
      setRow(77);
    } else if (row === 76) {
      // disable_network_layer();
      disableNetworkLayer();
      setRow(77);
    } else if (row === 77) {
      // }
      setRow(34);
    }
  }, [nextFrameToSend, ackExpected, frameExpected, r, buffer, nBuffered, i, event, sendData]);

  const canStep = useCallback((state: ViewerState) => {
    const { row, dataLinkEvent, physicalToDataLink, networkToDataLink } = state;

    if (row === 34 && dataLinkEvent.length === 0) {
      // wait_for_event(&event);
      return STALL_WAIT_FOR_EVENT;
    } else if (row === 38 && networkToDataLink.length === 0) {
      // from_network_layer(&buffer);
      return STALL_FROM_NETWORK_LAYER;
    } else if (row === 47 && physicalToDataLink.length === 0) {
      // from_physical_layer(&r);
      return STALL_FROM_PHYSICAL_LAYER;
    } else {
      return undefined;
    }
  }, []);

  return {
    initialRow: 28,
    code: code,
    step: step,
    canStep: canStep,
    locals:
      [`next_frame_to_send: ${nextFrameToSend}`,
      `ack_expected: ${ackExpected}`,
      `frame_expected: ${frameExpected}`,
      `r: ${r}`,
      `buffer: ${buffer}`,
      `nbuffered: ${nBuffered}`,
      `i: ${i}`,
      `event: ${event}`]
  }
}

export function Protocol5() {
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
          协议五：回退 N 协议（Go-back-n） Protocol 5 (Go-back-n)
        </Typography>
        <Typography>
          协议五允许有多个 frame 同时在传输。发送方可以在没收到 ack 的情况下，发送最多 MAX_SEQ 个 frame。此外，和前面协议不同的是，协议五不再假设网络层一直会有新的 packet。当网络层有新的 packet 要发送的时候，会触发 network_layer_ready 事件。Protocol 5 (Go-back-n) allows multiple outstanding frames. The sender may transmit up to MAX_SEQ frames without waiting for an ack. In addition, unlike in the previous protocols, the network layer is not assumed to have a new packet all the time. Instead, the network layer causes a network layer ready event when there is a packet to send.
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
      hideAddAckTimeoutEventButton={true}
    ></Viewer>
  </Box>;
}

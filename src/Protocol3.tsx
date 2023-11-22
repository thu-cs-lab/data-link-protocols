import { useCallback, useState } from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { Viewer, ViewerState } from './Viewer';
import { Frame, Packet, Event, STALL_FROM_NETWORK_LAYER, STALL_FROM_PHYSICAL_LAYER, STALL_WAIT_FOR_EVENT, EventType } from './Common';

function Sender() {
  const [nextFrameToSend, setNextFrameToSend] = useState<number>(0);
  const [s, setS] = useState<Frame>(new Frame());
  const [buffer, setBuffer] = useState<Packet>(new Packet());
  const [event, setEvent] = useState<EventType | undefined>();
  const code = `
  void sender3(void) {
    seq_nr next_frame_to_send; /* seq number of next outgoing frame */
    frame s;                   /* scratch variable */
    packet buffer;             /* buffer for an outbound packet */
    event_type event;
  
    next_frame_to_send = 0;      /* initialize outbound sequence numbers */
    from_network_layer(&buffer); /* fetch first packet */
    while (true) {
      s.info = buffer;            /* construct a frame for transmission */
      s.seq = next_frame_to_send; /* insert sequence number in frame */
      to_physical_layer(&s);      /* send it on its way */
      start_timer(s.seq);         /* if answer takes too long */
      wait_for_event(&event);     /* frame_arrival, cksum_err, timeout */
      if (event == frame_arrival) {
        from_physical_layer(&s); /* get the acknowledgement */
        if (s.ack == next_frame_to_send) {
          stop_timer(s.ack);           /* turn the timer off */
          from_network_layer(&buffer); /* get the next one to send */
          inc(next_frame_to_send);     /* invert next_frame_to_send */
        }
      }
    }
  }`;

  const step = useCallback((state: ViewerState) => {
    const { row, setRow, dataLinkEvent, setDataLinkEvent, dataLinkToPhysical, setDataLinkToPhysical, physicalToDataLink, setPhysicalToDataLink, networkToDataLink, setNetworkToDataLink } = state;

    if (row === 6) {
      // next_frame_to_send = 0;
      setNextFrameToSend(0);
      setRow(7);
    } else if (row === 7 && networkToDataLink.length > 0) {
      // from_network_layer(&buffer);
      setBuffer(networkToDataLink[0]);
      setNetworkToDataLink(networkToDataLink.slice(1));
      setRow(8);
    } else if (row === 8) {
      // while(true) {
      setRow(9);
    } else if (row === 9) {
      // s.info = buffer;
      setS(s.withInfo(buffer));
      setRow(10);
    } else if (row === 10) {
      // s.seq = next_frame_to_send;
      setS(s.withSeq(nextFrameToSend));
      setRow(11);
    } else if (row === 11) {
      // to_physical_layer(&s);
      setDataLinkToPhysical(dataLinkToPhysical.concat([s]));
      setRow(12);
    } else if (row === 12) {
      // start_timer(s.seq);
      setRow(13);
    } else if (row === 13 && dataLinkEvent.length > 0) {
      // wait_for_event(&event);
      setEvent(dataLinkEvent[0]);
      setDataLinkEvent(dataLinkEvent.slice(1));
      setRow(14);
    } else if (row === 14) {
      // if (event == frame_arrival) {
      if (event === Event.FrameArrival) {
        setRow(15);
      } else {
        setRow(21);
      }
    } else if (row === 15 && physicalToDataLink.length > 0) {
      // from_physical_layer(&s);
      setS(physicalToDataLink[0]);
      setPhysicalToDataLink(physicalToDataLink.slice(1));
      setRow(16);
    } else if (row === 16) {
      // if (s.ack == next_frame_to_send) {
      if (s.ack === nextFrameToSend) {
        setRow(17);
      } else {
        setRow(20);
      }
    } else if (row === 17) {
      // stop_timer(s.ack);
      setRow(18);
    } else if (row === 18 && networkToDataLink.length > 0) {
      // from_network_layer(&buffer);
      setBuffer(networkToDataLink[0]);
      setNetworkToDataLink(networkToDataLink.slice(1))
      setRow(19);
    } else if (row === 19) {
      // inc(next_frame_to_send);
      setNextFrameToSend(1 - nextFrameToSend);
      setRow(20);
    } else if (row === 20) {
      // }
      setRow(21);
    } else if (row === 21) {
      // }
      setRow(22);
    } else if (row === 22) {
      // }
      setRow(8);
    }
  }, [nextFrameToSend, s, buffer, event]);

  const canStep = useCallback((state: ViewerState) => {
    const { row, dataLinkEvent, physicalToDataLink, networkToDataLink } = state;

    if (row === 7 && networkToDataLink.length === 0) {
      // from_network_layer(&buffer);
      return STALL_FROM_NETWORK_LAYER;
    } else if (row === 13 && dataLinkEvent.length === 0) {
      // wait_for_event(&event);
      return STALL_WAIT_FOR_EVENT;
    } else if (row === 15 && physicalToDataLink.length === 0) {
      // from_physical_layer(&s);
      return STALL_FROM_PHYSICAL_LAYER;
    } else if (row === 18 && networkToDataLink.length === 0) {
      // from_network_layer(&buffer);
      return STALL_FROM_NETWORK_LAYER;
    } else {
      return undefined;
    }
  }, []);

  return {
    initialRow: 6,
    code: code,
    step: step,
    canStep: canStep,
    locals:
      [`next_frame_to_send: ${nextFrameToSend}`, `s: ${s}`, `buffer: ${buffer}`, `event: ${event}`]
  }
}

function Receiver() {
  const [frameExpected, setFrameExpected] = useState<number>(0);
  const [r, setR] = useState<Frame>(new Frame());
  const [s, setS] = useState<Frame>(new Frame());
  const [event, setEvent] = useState<EventType | undefined>();
  const code = `
  void receiver3(void) {
    seq_nr frame_expected;
    frame r, s;
    event_type event;
  
    frame_expected = 0;
    while (true) {
      wait_for_event(&event);       /* possibilities: frame_arrival, cksum_err */
      if (event == frame_arrival) { /* a valid frame has arrived */
        from_physical_layer(&r);    /* go get the newly arrived frame */
        if (r.seq == frame_expected) { /* this is what we have been waiting for */
          to_network_layer(&r.info);   /* pass the data to the network layer */
          inc(frame_expected); /* next time expect the other sequence nr */
        }
        s.ack = 1 - frame_expected; /* tell which frame is being acked */
        to_physical_layer(&s);      /* send acknowledgement */
      }
    }
  }`;

  const step = useCallback((state: ViewerState) => {
    const { row, setRow, dataLinkEvent, setDataLinkEvent, dataLinkToPhysical, setDataLinkToPhysical, physicalToDataLink, setPhysicalToDataLink, dataLinkToNetwork, setDataLinkToNetwork } = state;

    if (row === 5) {
      // frame_expected = 0;
      setFrameExpected(0);
      setRow(6);
    } else if (row === 6) {
      // while (true) {
      setRow(7);
    } else if (row === 7 && dataLinkEvent.length > 0) {
      // wait_for_event(&event);
      setEvent(dataLinkEvent[0]);
      setDataLinkEvent(dataLinkEvent.slice(1));
      setRow(8);
    } else if (row === 8) {
      // if (event == frame_arrival) {
      if (event === Event.FrameArrival) {
        setRow(9);
      } else {
        setRow(16);
      }
    } else if (row === 9 && physicalToDataLink.length > 0) {
      // from_physical_layer(&r);
      setR(physicalToDataLink[0]);
      setPhysicalToDataLink(physicalToDataLink.slice(1));
      setRow(10);
    } else if (row === 10) {
      // if (r.seq == frame_expected) {
      if (r.seq === frameExpected) {
        setRow(11);
      } else {
        setRow(13);
      }
    } else if (row === 11) {
      // to_network_layer(&r.info);
      setDataLinkToNetwork(dataLinkToNetwork.concat([r.info!]));
      setRow(12);
    } else if (row === 12) {
      // inc(frame_expected);
      setFrameExpected(1 - frameExpected);
      setRow(13);
    } else if (row === 13) {
      // }
      setRow(14);
    } else if (row === 14) {
      // s.ack = 1 - frame_expected;
      setS(s.withAck(1 - frameExpected));
      setRow(15);
    } else if (row === 15) {
      // to_physical_layer(&s);
      setDataLinkToPhysical(dataLinkToPhysical.concat([s]));
      setRow(16);
    } else if (row === 16) {
      // }
      setRow(17);
    } else if (row === 17) {
      // }
      setRow(6);
    }
  }, [frameExpected, r, s, event]);

  const canStep = useCallback((state: ViewerState) => {
    const { row, dataLinkEvent, physicalToDataLink } = state;

    if (row === 7 && dataLinkEvent.length === 0) {
      // wait_for_event(&event);
      return STALL_WAIT_FOR_EVENT;
    } else if (row === 9 && physicalToDataLink.length === 0) {
      // from_physical_layer(&r);
      return STALL_FROM_PHYSICAL_LAYER;
    } else {
      return undefined;
    }
  }, []);


  return {
    initialRow: 5,
    code: code,
    step: step,
    canStep: canStep,
    locals:
      [`frame_expected: ${frameExpected}`, `r: ${r}`, `s: ${s}`, `event: ${event}`]
  }
}

export function Protocol3() {
  const {
    initialRow: initialSenderRow,
    code: senderCode,
    step: stepSender,
    canStep: canStepSender,
    locals: senderLocals
  } = Sender();

  const {
    initialRow: initialReceiverRow,
    code: receiverCode,
    step: stepReceiver,
    canStep: canStepReceiver,
    locals: receiverLocals
  } = Receiver();

  return <Box>
    <Grid item xs={12}>
      <Paper sx={{
        padding: '30px',
      }}>
        <Typography variant="h4">
          协议三：自动重复请求（ARQ，Automatic Repeat reQuest）或带有重传的肯定确认（PAR，Positive Acknowledgement with Retransmission） Protocol 3 (ARQ, Automatic Repeat reQuest or PAR, Positive Acknowledgement with Retransmission)
        </Typography>
        <Typography>
          协议三实现了不可靠信道上的单向数据传输。Protocol 3 (PAR) allows unidirectional data flow over an unreliable channel.
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
      hideSenderDataLinkToNetwork={true}
      hideReceiverNetworkInput={true}
      hideReceiverNetworkToDataLink={true}
      hideAddAckTimeoutEventButton={true}
    ></Viewer>

  </Box>;
}

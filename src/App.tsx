import { useCallback, useState } from 'react';
import './App.css';
import { Box, Container, Grid, Paper, Typography } from '@mui/material';
import { Viewer, ViewerState } from './Viewer';
import { Frame, Packet, Event, STALL_FROM_NETWORK_LAYER, STALL_FROM_PHYSICAL_LAYER, STALL_WAIT_FOR_EVENT } from './Common';

function Protocol1() {
  // frame s;
  const [senderS1, setSenderS1] = useState<Frame>(new Frame());
  // packet buffer;
  const [senderBuffer1, setSenderBuffer1] = useState<Packet>(new Packet());
  const senderCode1 = `
  void sender1(void) {
    frame s;       /* buffer for an outbound frame */
    packet buffer; /* buffer for an outbound packet */
    while (true) {
      from_network_layer(&buffer); /* go get something to send */
      s.info = buffer;             /* copy it into s for transmission */
      to_physical_layer(&s);       /* send it on its way */
    }
  }`;

  const stepSender1 = useCallback((state: ViewerState) => {
    const row = state.senderRow;
    const setRow = state.setSenderRow;
    const networkToDataLink = state.senderNetworkToDataLink;
    const setNetworkToDataLink = state.setSenderNetworkToDataLink;
    const dataLinkToPhysical = state.senderDataLinkToPhysical;
    const setDataLinkToPhysical = state.setSenderDataLinkToPhysical;
    const buffer = senderBuffer1;
    const setBuffer = setSenderBuffer1;
    const s = senderS1;
    const setS = setSenderS1;

    if (row === 3) {
      // while (true) {
      setRow(4);
    } else if (row === 4 && networkToDataLink.length > 0) {
      // from_network_layer(&buffer);
      setBuffer(networkToDataLink[0])
      setNetworkToDataLink(networkToDataLink.slice(1));
      setRow(5);
    } else if (row === 5) {
      // s.info = buffer;
      setS(s.withInfo(buffer));
      setRow(6);
    } else if (row === 6) {
      // to_physical_layer(&s);
      setDataLinkToPhysical(dataLinkToPhysical.concat(s));
      setRow(7);
    } else if (row === 7) {
      // }
      setRow(3);
    }
  }, [senderS1, senderBuffer1]);

  const canStepSender1 = useCallback((state: ViewerState) => {
    const row = state.senderRow;
    const networkToDataLink = state.senderNetworkToDataLink;

    if (row === 4 && networkToDataLink.length === 0) {
      // from_network_layer(&buffer);
      return STALL_FROM_NETWORK_LAYER;
    } else {
      return undefined;
    }
  }, []);

  const [receiverR1, setReceiverR1] = useState<Frame>(new Frame());
  const [receiverEvent1, setReceiverEvent1] = useState<Event | undefined>();
  const receiverCode1 = `
  void receiver1(void) {
    frame r;
    event_type event; /* filled in by wait, but not used here */
    while (true) {
      wait_for_event(&event);    /* only possibility is frame_arrival */
      from_physical_layer(&r);   /* go get the inbound frame */
      to_network_layer(&r.info); /* pass the data to the network layer */
    }
  }`;

  const stepReceiver1 = useCallback((state: ViewerState) => {
    const row = state.receiverRow;
    const setRow = state.setReceiverRow;
    const dataLinkEvent = state.receiverDataLinkEvent;
    const setDataLinkEvent = state.setReceiverDataLinkEvent;
    const dataLinkToNetwork = state.receiverDataLinkToNetwork;
    const setDataLinkToNetwork = state.setReceiverDataLinkToNetwork;
    const physicalToDataLink = state.receiverPhysicalToDataLink;
    const setPhysicalToDataLink = state.setReceiverPhysicalToDataLink;
    const setEvent = setReceiverEvent1;
    const r = receiverR1;
    const setR = setReceiverR1;

    if (row === 3) {
      // while (true) {
      setRow(4);
    } else if (row === 4 && dataLinkEvent.length > 0) {
      // wait_for_event(&event);
      setEvent(dataLinkEvent[0]);
      setDataLinkEvent(dataLinkEvent.slice(1));
      setRow(5);
    } else if (row === 5 && physicalToDataLink.length > 0) {
      // from_physical_layer(&r);
      setR(physicalToDataLink[0]);
      setPhysicalToDataLink(physicalToDataLink.slice(1));
      setRow(6);
    } else if (row === 6) {
      // to_network_layer(&r.info);
      setDataLinkToNetwork(dataLinkToNetwork.concat([r.info!]));
      setRow(7);
    } else if (row === 7) {
      // }
      setRow(3);
    }
  }, [receiverR1]);

  const canStepReceiver1 = useCallback((state: ViewerState) => {
    const row = state.receiverRow;
    const dataLinkEvent = state.receiverDataLinkEvent;
    const physicalToDataLink = state.receiverPhysicalToDataLink;

    if (row === 4 && dataLinkEvent.length === 0) {
      // wait_for_event(&event);
      return STALL_WAIT_FOR_EVENT;
    } else if (row === 5 && physicalToDataLink.length === 0) {
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
          协议一：乌托邦协议（Utopia） Protocol 1 (Utopia)
        </Typography>
        <Typography>
          协议一提供了从发送方到接收方的单向数据传输。协议一假设了传输通道是无差错的，并且接收方可以任意快地处理输入数据。因此，发送方只需要循环发送数据，多快都可以。Protocol 1 (Utopia) provides for data transmission in one direction only, from sender to receiver. The communication channel is assumed to be error free and the receiver is assumed to be able to process all the input infinitely quickly. Consequently, the sender just sits in a loop pumping data out onto the line as fast as it can.
        </Typography>
      </Paper>
    </Grid>
    <Viewer
      initialSenderRow={3} senderCode={senderCode1}
      stepSender={stepSender1} canStepSender={canStepSender1}
      senderLocals={
        [`s: ${senderS1}`, `buffer: ${senderBuffer1}`]
      }
      initialReceiverRow={3} receiverCode={receiverCode1}
      stepReceiver={stepReceiver1} canStepReceiver={canStepReceiver1}
      receiverLocals={
        [`r: ${receiverR1}`, `event: ${receiverEvent1}`]
      }
      hideSenderDataLinkEvent={true}
      hideSenderPhysicalToDataLink={true}
      hideSenderDataLinkToNetwork={true}
      hideReceiverDataLinkToPhysical={true}
      hideReceiverNetworkInput={true}
      hideReceiverNetworkToDataLink={true}
      hideAddEventButton={true}
    ></Viewer>
  </Box>;
}

function Protocol2() {
  const [senderS2, setSenderS2] = useState<Frame>(new Frame());
  const [senderBuffer2, setSenderBuffer2] = useState<Packet>(new Packet());
  const [senderEvent2, setSenderEvent2] = useState<Event | undefined>();
  const senderCode2 = `
  void sender2(void) {
    frame s;          /* buffer for an outbound frame */
    packet buffer;    /* buffer for an outbound packet */
    event_type event; /* frame_arrival is the only possibility */
    while (true) {
      from_network_layer(&buffer); /* go get something to send */
      s.info = buffer;             /* copy it into s for transmission */
      to_physical_layer(&s);       /* bye-byte little frame */
      wait_for_event(&event);      /* do not proceed until given the go ahead */
    }
  }`;

  const stepSender2 = useCallback((state: ViewerState) => {
    const row = state.senderRow;
    const setRow = state.setSenderRow;
    const networkToDataLink = state.senderNetworkToDataLink;
    const setNetworkToDataLink = state.setSenderNetworkToDataLink;
    const dataLinkToPhysical = state.senderDataLinkToPhysical;
    const setDataLinkToPhysical = state.setSenderDataLinkToPhysical;
    const dataLinkEvent = state.senderDataLinkEvent;
    const setDataLinkEvent = state.setSenderDataLinkEvent;
    const buffer = senderBuffer2;
    const setBuffer = setSenderBuffer2;
    const s = senderS2;
    const setS = setSenderS2;
    const setEvent = setSenderEvent2;

    if (row === 4) {
      // while (true) {
      setRow(5);
    } else if (row === 5 && networkToDataLink.length > 0) {
      // from_network_layer(&buffer);
      setBuffer(networkToDataLink[0]);
      setNetworkToDataLink(networkToDataLink.slice(1));
      setRow(6);
    } else if (row === 6) {
      // s.info = buffer;
      setS(s.withInfo(buffer));
      setRow(7);
    } else if (row === 7) {
      // to_physical_layer(&s);
      setDataLinkToPhysical(dataLinkToPhysical.concat(s));
      setRow(8);
    } else if (row === 8 && dataLinkEvent.length > 0) {
      // wait_for_event(&event);
      setEvent(dataLinkEvent[0]);
      setDataLinkEvent(dataLinkEvent.slice(1));
      setRow(9);
    } else if (row === 9) {
      // }
      setRow(4);
    }
  }, [senderS2, senderBuffer2]);

  const canStepSender2 = useCallback((state: ViewerState) => {
    const row = state.senderRow;
    const networkToDataLink = state.senderNetworkToDataLink;
    const dataLinkEvent = state.senderDataLinkEvent;

    if (row === 5 && networkToDataLink.length === 0) {
      // from_network_layer(&buffer);
      return STALL_FROM_NETWORK_LAYER;
    } else if (row === 8 && dataLinkEvent.length === 0) {
      // wait_for_event(&event);
      return STALL_WAIT_FOR_EVENT;
    } else {
      return undefined;
    }
  }, []);

  const [receiverR2, setReceiverR2] = useState<Frame>(new Frame());
  const [receiverS2, setReceiverS2] = useState<Frame>(new Frame());
  const [receiverEvent2, setReceiverEvent2] = useState<Event | undefined>();
  const receiverCode2 = `
  void receiver2(void) {
    frame r, s;       /* buffers for frames */
    event_type event; /* frame_arrival is the only possibility */
    while (true) {
      wait_for_event(&event);    /* only possibility is frame_arrival */
      from_physical_layer(&r);   /* go get the inbound frame */
      to_network_layer(&r.info); /* pass the data to the network layer */
      to_physical_layer(&s);     /* send a dummy frame to awaken sender */
    }
  }`;

  const stepReceiver2 = useCallback((state: ViewerState) => {
    const row = state.receiverRow;
    const setRow = state.setReceiverRow;
    const dataLinkEvent = state.receiverDataLinkEvent;
    const setDataLinkEvent = state.setReceiverDataLinkEvent;
    const dataLinkToNetwork = state.receiverDataLinkToNetwork;
    const setDataLinkToNetwork = state.setReceiverDataLinkToNetwork;
    const dataLinkToPhysical = state.receiverDataLinkToPhysical;
    const setDataLinkToPhysical = state.setReceiverDataLinkToPhysical;
    const physicalToDataLink = state.receiverPhysicalToDataLink;
    const setPhysicalToDataLink = state.setReceiverPhysicalToDataLink;
    const setEvent = setReceiverEvent2;
    const r = receiverR2;
    const setR = setReceiverR2;
    const s = receiverS2;

    if (row === 3) {
      // while (true) {
      setRow(4);
    } else if (row === 4 && dataLinkEvent.length > 0) {
      // wait_for_event(&event);
      setEvent(dataLinkEvent[0]);
      setDataLinkEvent(dataLinkEvent.slice(1));
      setRow(5);
    } else if (row === 5 && physicalToDataLink.length > 0) {
      // from_physical_layer(&r);
      setR(physicalToDataLink[0]);
      setPhysicalToDataLink(physicalToDataLink.slice(1));
      setRow(6);
    } else if (row === 6) {
      // to_network_layer(&r.info);
      setDataLinkToNetwork(dataLinkToNetwork.concat([r.info!]));
      setRow(7);
    } else if (row === 7) {
      // to_physical_layer(&s);
      setDataLinkToPhysical(dataLinkToPhysical.concat([s]));
      setRow(8);
    } else if (row === 8) {
      // }
      setRow(3);
    }
  }, [receiverR2, receiverS2]);

  const canStepReceiver2 = useCallback((state: ViewerState) => {
    const row = state.receiverRow;
    const dataLinkEvent = state.receiverDataLinkEvent;
    const physicalToDataLink = state.receiverPhysicalToDataLink;

    if (row === 4 && dataLinkEvent.length === 0) {
      // wait_for_event(&event);
      return STALL_WAIT_FOR_EVENT;
    } else if (row === 5 && physicalToDataLink.length === 0) {
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
          协议二：停止-等待协议（Stop-and-Wait） Protocol 2 (Stop-and-wait)
        </Typography>
        <Typography>
          协议二（停止-等待，简称停等协议）也提供了从发送端到接收端的单向数据流。与协议一一样，依然假设通信信道无差错。但是，这次接收端只有有限的缓冲区容量和有限的处理速度，因此协议必须明确防止发送端以快于接收端能处理的速度，向接收端发送数据。Protocol 2 (Stop-and-wait) also provides for a one-directional flow of data from sender to receiver. The communication channel is once again assumed to be error free, as in protocol 1. However, this time the receiver has only a finite buffer capacity and a finite processing speed, so the protocol must explicitly prevent the sender from flooding the receiver with data faster than it can be handled.
        </Typography>
      </Paper>
    </Grid>
    <Viewer
      initialSenderRow={4} senderCode={senderCode2}
      stepSender={stepSender2} canStepSender={canStepSender2}
      senderLocals={
        [`s: ${senderS2}`, `buffer: ${senderBuffer2}`, `event: ${senderEvent2}`]
      }
      initialReceiverRow={3} receiverCode={receiverCode2}
      stepReceiver={stepReceiver2} canStepReceiver={canStepReceiver2}
      receiverLocals={
        [`r: ${receiverR2}`, `s: ${receiverS2}`, `event: ${receiverEvent2}`]
      }
      hideSenderDataLinkToNetwork={true}
      hideReceiverNetworkInput={true}
      hideReceiverNetworkToDataLink={true}
      hideAddEventButton={true}
    ></Viewer>
  </Box>;
}

function Protocol3() {
  const [senderNextFrameToSend3, setSenderNextFrameToSend3] = useState<number>(0);
  const [senderS3, setSenderS3] = useState<Frame>(new Frame());
  const [senderBuffer3, setSenderBuffer3] = useState<Packet>(new Packet());
  const [senderEvent3, setSenderEvent3] = useState<Event | undefined>();
  const senderCode3 = `
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

  const stepSender3 = useCallback((state: ViewerState) => {
    const row = state.senderRow;
    const setRow = state.setSenderRow;
    const networkToDataLink = state.senderNetworkToDataLink;
    const setNetworkToDataLink = state.setSenderNetworkToDataLink;
    const dataLinkToPhysical = state.senderDataLinkToPhysical;
    const setDataLinkToPhysical = state.setSenderDataLinkToPhysical;
    const physicalToDataLink = state.senderPhysicalToDataLink;
    const setPhysicalToDataLink = state.setSenderPhysicalToDataLink;
    const dataLinkEvent = state.senderDataLinkEvent;
    const setDataLinkEvent = state.setSenderDataLinkEvent;
    const buffer = senderBuffer3;
    const setBuffer = setSenderBuffer3;
    const s = senderS3;
    const setS = setSenderS3;
    const event = senderEvent3;
    const setEvent = setSenderEvent3;
    const nextFrameToSend = senderNextFrameToSend3;
    const setNextFrameToSend = setSenderNextFrameToSend3;

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
  }, [senderNextFrameToSend3, senderS3, senderBuffer3, senderEvent3]);

  const canStepSender3 = useCallback((state: ViewerState) => {
    const row = state.senderRow;
    const networkToDataLink = state.senderNetworkToDataLink;
    const dataLinkEvent = state.senderDataLinkEvent;
    const physicalToDataLink = state.senderPhysicalToDataLink;

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

  const [receiverFrameExpected3, setReceiverFrameExpected3] = useState<number>(0);
  const [receiverR3, setReceiverR3] = useState<Frame>(new Frame());
  const [receiverS3, setReceiverS3] = useState<Frame>(new Frame());
  const [receiverEvent3, setReceiverEvent3] = useState<Event | undefined>();
  const receiverCode3 = `
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

  const stepReceiver3 = useCallback((state: ViewerState) => {
    const row = state.receiverRow;
    const setRow = state.setReceiverRow;
    const dataLinkToPhysical = state.receiverDataLinkToPhysical;
    const setDataLinkToPhysical = state.setReceiverDataLinkToPhysical;
    const dataLinkToNetwork = state.receiverDataLinkToNetwork;
    const setDataLinkToNetwork = state.setReceiverDataLinkToNetwork;
    const physicalToDataLink = state.receiverPhysicalToDataLink;
    const setPhysicalToDataLink = state.setReceiverPhysicalToDataLink;
    const dataLinkEvent = state.receiverDataLinkEvent;
    const setDataLinkEvent = state.setReceiverDataLinkEvent;
    const s = receiverS3;
    const setS = setReceiverS3;
    const r = receiverR3;
    const setR = setReceiverR3;
    const event = receiverEvent3;
    const setEvent = setReceiverEvent3;
    const frameExpected = receiverFrameExpected3;
    const setFrameExpected = setReceiverFrameExpected3;

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
  }, [receiverFrameExpected3, receiverR3, receiverS3, receiverEvent3]);

  const canStepReceiver3 = useCallback((state: ViewerState) => {
    const row = state.receiverRow;
    const dataLinkEvent = state.receiverDataLinkEvent;
    const physicalToDataLink = state.receiverPhysicalToDataLink;

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
      initialSenderRow={6} senderCode={senderCode3}
      stepSender={stepSender3} canStepSender={canStepSender3}
      senderLocals={
        [`next_frame_to_send: ${senderNextFrameToSend3}`, `s: ${senderS3}`, `buffer: ${senderBuffer3}`, `event: ${senderEvent3}`]
      }
      initialReceiverRow={5} receiverCode={receiverCode3}
      stepReceiver={stepReceiver3} canStepReceiver={canStepReceiver3}
      receiverLocals={
        [`frame_expected: ${receiverFrameExpected3}`, `r: ${receiverR3}`, `s: ${receiverS3}`, `event: ${receiverEvent3}`]
      }
      hideSenderDataLinkToNetwork={true}
      hideReceiverNetworkInput={true}
      hideReceiverNetworkToDataLink={true}
    ></Viewer>

  </Box>;
}

function Protocol4() {
  const [senderNextFrameToSend4, setSenderNextFrameToSend4] = useState<number>(0);
  const [senderFrameExpected4, setSenderFrameExpected4] = useState<number>(0);
  const [senderR4, setSenderR4] = useState<Frame>(new Frame());
  const [senderS4, setSenderS4] = useState<Frame>(new Frame());
  const [senderBuffer4, setSenderBuffer4] = useState<Packet>(new Packet());
  const [senderEvent4, setSenderEvent4] = useState<Event | undefined>();
  const senderCode4 = `
  void protocol4(void) {
    seq_nr next_frame_to_send; /* 0 or 1 only */
    seq_nr frame_expected;     /* 0 or 1 only */
    frame r, s;                /* scratch variables */
    packet buffer;             /* current packet being sent */
    event_type event;
    next_frame_to_send = 0;      /* next frame on the outbound stream */
    frame_expected = 0;          /* frame expected next */
    from_network_layer(&buffer); /* fetch a packet from the network layer */
    s.info = buffer;             /* prepare to send the initial frame */
    s.seq = next_frame_to_send;  /* insert sequence number info frame */
    s.ack = 1 - frame_expected;  /* piggybacked ack */
    to_physical_layer(&s);       /* transmit the frame */
    start_timer(s.seq);          /* start the timer running */
    while (true) {
      wait_for_event(&event);          /* frame_arrival, cksum_err, or timeout */
      if (event == frame_arrival) {    /* a frame has arrived undamaged */
        from_physical_layer(&r);       /* go get it */
        if (r.seq == frame_expected) { /* handle inbound frame stream */
          to_network_layer(&r.info);   /* pass packet to network layer */
          inc(frame_expected);         /* invert seq number expected next */
        }
        if (r.ack == next_frame_to_send) { /* handle outbound frame stream */
          stop_timer(r.ack);               /* turn the timer off */
          from_network_layer(&buffer);     /* fetch new pkt from network layer */
          inc(next_frame_to_send);         /* invert sender's sequence number */
        }
      }
      s.info = buffer;            /* construct outbound frame */
      s.seq = next_frame_to_send; /* insert sequence number into it */
      s.ack = 1 - frame_expected; /* seq number of last received frame */
      to_physical_layer(&s);      /* transmit a frame */
      start_timer(s.seq);         /* start the timer running */
    }
  }`;

  const stepSender4 = useCallback((state: ViewerState) => {
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
    const buffer = senderBuffer4;
    const setBuffer = setSenderBuffer4;
    const r = senderR4;
    const setR = setSenderR4;
    const s = senderS4;
    const setS = setSenderS4;
    const event = senderEvent4;
    const setEvent = setSenderEvent4;
    const nextFrameToSend = senderNextFrameToSend4;
    const setNextFrameToSend = setSenderNextFrameToSend4;
    const frameExpected = senderFrameExpected4;
    const setFrameExpected = setSenderFrameExpected4;

    if (row === 6) {
      // next_frame_to_send = 0;
      setNextFrameToSend(0);
      setRow(7);
    } else if (row === 7) {
      // frame_expected = 0;
      setFrameExpected(0);
      setRow(8);
    } else if (row === 8 && networkToDataLink.length > 0) {
      // from_network_layer(&buffer);
      setBuffer(networkToDataLink[0]);
      setNetworkToDataLink(networkToDataLink.slice(1));
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
      // s.ack = 1 - frame_expected;
      setS(s.withAck(1 - nextFrameToSend));
      setRow(12);
    } else if (row === 12) {
      // to_physical_layer(&s);
      setDataLinkToPhysical(dataLinkToPhysical.concat([s]));
      setRow(13);
    } else if (row === 13) {
      // start_timer(s.seq);
      setRow(14);
    } else if (row === 14) {
      // while (true) {
      setRow(15);
    } else if (row === 15 && dataLinkEvent.length > 0) {
      // wait_for_event(&event);
      setEvent(dataLinkEvent[0]);
      setDataLinkEvent(dataLinkEvent.slice(1));
      setRow(16);
    } else if (row === 16) {
      // if (event == frame_arrival) {
      if (event === Event.FrameArrival) {
        setRow(17);
      } else {
        setRow(27);
      }
    } else if (row === 17 && physicalToDataLink.length > 0) {
      // from_physical_layer(&r);
      setR(physicalToDataLink[0]);
      setPhysicalToDataLink(physicalToDataLink.slice(1));
      setRow(18);
    } else if (row === 18) {
      // if (r.seq == frame_expected) {
      if (r.seq === frameExpected) {
        setRow(19);
      } else {
        setRow(21);
      }
    } else if (row === 19) {
      // to_network_layer(&r.info);
      setDataLinkToNetwork(dataLinkToNetwork.concat([r.info!]));
      setRow(20);
    } else if (row === 20) {
      // inc(frame_expected);
      setFrameExpected(1 - frameExpected);
      setRow(21);
    } else if (row === 21) {
      // }
      setRow(22);
    } else if (row === 22) {
      // if (r.ack == next_frame_to_send) {
      if (r.ack === nextFrameToSend) {
        setRow(23);
      } else {
        setRow(26);
      }
    } else if (row === 23) {
      // stop_timer(r.ack);
      setRow(24);
    } else if (row === 24 && networkToDataLink.length > 0) {
      // from_network_layer(&buffer);
      setBuffer(networkToDataLink[0]);
      setNetworkToDataLink(networkToDataLink.slice(1));
      setRow(25);
    } else if (row === 25) {
      // inc(next_frame_to_send);
      setRow(26);
    } else if (row === 26) {
      // }
      setRow(27);
    } else if (row === 27) {
      // }
      setRow(28);
    } else if (row === 28) {
      // s.info = buffer;
      setS(s.withInfo(buffer));
      setRow(29);
    } else if (row === 29) {
      // s.seq = next_frame_to_send;
      setS(s.withSeq(nextFrameToSend));
      setRow(30);
    } else if (row === 30) {
      // s.ack = 1 - frame_expected;
      setS(s.withAck(1 - frameExpected));
      setRow(31);
    } else if (row === 31) {
      // to_physical_layer(&s);
      setDataLinkToPhysical(dataLinkToPhysical.concat([s]));
      setRow(32);
    } else if (row === 32) {
      // start_timer(s.seq);
      setRow(33);
    } else if (row === 33) {
      // }
      setRow(14);
    }
  }, [senderNextFrameToSend4, senderFrameExpected4, senderR4, senderS4, senderBuffer4, senderEvent4]);

  const canStepSender4 = useCallback((state: ViewerState) => {
    const row = state.senderRow;
    const networkToDataLink = state.senderNetworkToDataLink;
    const dataLinkEvent = state.senderDataLinkEvent;
    const physicalToDataLink = state.senderPhysicalToDataLink;

    if (row === 8 && networkToDataLink.length === 0) {
      // from_network_layer(&buffer);
      return STALL_FROM_NETWORK_LAYER;
    } else if (row === 15 && dataLinkEvent.length === 0) {
      // wait_for_event(&event);
      return STALL_WAIT_FOR_EVENT;
    } else if (row === 17 && physicalToDataLink.length === 0) {
      // from_physical_layer(&r);
      return STALL_FROM_PHYSICAL_LAYER;
    } else if (row === 24 && networkToDataLink.length === 0) {
      // from_network_layer(&buffer);
      return STALL_FROM_NETWORK_LAYER;
    } else {
      return undefined;
    }
  }, []);

  const [receiverNextFrameToSend4, setReceiverNextFrameToSend4] = useState<number>(0);
  const [receiverFrameExpected4, setReceiverFrameExpected4] = useState<number>(0);
  const [receiverR4, setReceiverR4] = useState<Frame>(new Frame());
  const [receiverS4, setReceiverS4] = useState<Frame>(new Frame());
  const [receiverBuffer4, setReceiverBuffer4] = useState<Packet>(new Packet());
  const [receiverEvent4, setReceiverEvent4] = useState<Event | undefined>();
  const receiverCode4 = senderCode4;

  const stepReceiver4 = useCallback((state: ViewerState) => {
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
    const buffer = receiverBuffer4;
    const setBuffer = setReceiverBuffer4;
    const r = receiverR4;
    const setR = setReceiverR4;
    const s = receiverS4;
    const setS = setReceiverS4;
    const event = receiverEvent4;
    const setEvent = setReceiverEvent4;
    const nextFrameToSend = receiverNextFrameToSend4;
    const setNextFrameToSend = setReceiverNextFrameToSend4;
    const frameExpected = receiverFrameExpected4;
    const setFrameExpected = setReceiverFrameExpected4;

    if (row === 6) {
      // next_frame_to_send = 0;
      setNextFrameToSend(0);
      setRow(7);
    } else if (row === 7) {
      // frame_expected = 0;
      setFrameExpected(0);
      setRow(8);
    } else if (row === 8 && networkToDataLink.length > 0) {
      // from_network_layer(&buffer);
      setBuffer(networkToDataLink[0]);
      setNetworkToDataLink(networkToDataLink.slice(1));
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
      // s.ack = 1 - frame_expected;
      setS(s.withAck(1 - nextFrameToSend));
      setRow(12);
    } else if (row === 12) {
      // to_physical_layer(&s);
      setDataLinkToPhysical(dataLinkToPhysical.concat([s]));
      setRow(13);
    } else if (row === 13) {
      // start_timer(s.seq);
      setRow(14);
    } else if (row === 14) {
      // while (true) {
      setRow(15);
    } else if (row === 15 && dataLinkEvent.length > 0) {
      // wait_for_event(&event);
      setEvent(dataLinkEvent[0]);
      setDataLinkEvent(dataLinkEvent.slice(1));
      setRow(16);
    } else if (row === 16) {
      // if (event == frame_arrival) {
      if (event === Event.FrameArrival) {
        setRow(17);
      } else {
        setRow(27);
      }
    } else if (row === 17 && physicalToDataLink.length > 0) {
      // from_physical_layer(&r);
      setR(physicalToDataLink[0]);
      setPhysicalToDataLink(physicalToDataLink.slice(1));
      setRow(18);
    } else if (row === 18) {
      // if (r.seq == frame_expected) {
      if (r.seq === frameExpected) {
        setRow(19);
      } else {
        setRow(21);
      }
    } else if (row === 19) {
      // to_network_layer(&r.info);
      setDataLinkToNetwork(dataLinkToNetwork.concat([r.info!]));
      setRow(20);
    } else if (row === 20) {
      // inc(frame_expected);
      setFrameExpected(1 - frameExpected);
      setRow(21);
    } else if (row === 21) {
      // }
      setRow(22);
    } else if (row === 22) {
      // if (r.ack == next_frame_to_send) {
      if (r.ack === nextFrameToSend) {
        setRow(23);
      } else {
        setRow(26);
      }
    } else if (row === 23) {
      // stop_timer(r.ack);
      setRow(24);
    } else if (row === 24 && networkToDataLink.length > 0) {
      // from_network_layer(&buffer);
      setBuffer(networkToDataLink[0]);
      setNetworkToDataLink(networkToDataLink.slice(1));
      setRow(25);
    } else if (row === 25) {
      // inc(next_frame_to_send);
      setRow(26);
    } else if (row === 26) {
      // }
      setRow(27);
    } else if (row === 27) {
      // }
      setRow(28);
    } else if (row === 28) {
      // s.info = buffer;
      setS(s.withInfo(buffer));
      setRow(29);
    } else if (row === 29) {
      // s.seq = next_frame_to_send;
      setS(s.withSeq(nextFrameToSend));
      setRow(30);
    } else if (row === 30) {
      // s.ack = 1 - frame_expected;
      setS(s.withAck(1 - frameExpected));
      setRow(31);
    } else if (row === 31) {
      // to_physical_layer(&s);
      setDataLinkToPhysical(dataLinkToPhysical.concat([s]));
      setRow(32);
    } else if (row === 32) {
      // start_timer(s.seq);
      setRow(33);
    } else if (row === 33) {
      // }
      setRow(14);
    }
  }, [receiverNextFrameToSend4, receiverFrameExpected4, receiverR4, receiverS4, receiverBuffer4, receiverEvent4]);

  const canStepReceiver4 = useCallback((state: ViewerState) => {
    const row = state.receiverRow;
    const networkToDataLink = state.receiverNetworkToDataLink;
    const dataLinkEvent = state.receiverDataLinkEvent;
    const physicalToDataLink = state.receiverPhysicalToDataLink;

    if (row === 8 && networkToDataLink.length === 0) {
      // from_network_layer(&buffer);
      return STALL_FROM_NETWORK_LAYER;
    } else if (row === 15 && dataLinkEvent.length === 0) {
      // wait_for_event(&event);
      return STALL_WAIT_FOR_EVENT;
    } else if (row === 17 && physicalToDataLink.length === 0) {
      // from_physical_layer(&r);
      return STALL_FROM_PHYSICAL_LAYER;
    } else if (row === 24 && networkToDataLink.length === 0) {
      // from_network_layer(&buffer);
      return STALL_FROM_NETWORK_LAYER;
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
          协议四：滑动窗口（Sliding Window） Protocol 4 (Sliding window)
        </Typography>
        <Typography>
          协议四实现了双向数据传输。Protocol 4 (Sliding window) is bidirectional.
        </Typography>
      </Paper>
    </Grid>
    <Viewer
      initialSenderRow={6} senderCode={senderCode4}
      stepSender={stepSender4} canStepSender={canStepSender4}
      senderLocals={
        [`next_frame_to_send: ${senderNextFrameToSend4}`, `frame_expected: ${senderFrameExpected4}`, `r: ${senderR4}`, `s: ${senderS4}`, `buffer: ${senderBuffer4}`, `event: ${senderEvent4}`]
      }
      initialReceiverRow={6} receiverCode={receiverCode4}
      stepReceiver={stepReceiver4} canStepReceiver={canStepReceiver4}
      receiverLocals={
        [`next_frame_to_send: ${receiverNextFrameToSend4}`, `frame_expected: ${receiverFrameExpected4}`, `r: ${receiverR4}`, `s: ${receiverS4}`, `buffer: ${receiverBuffer4}`, `event: ${receiverEvent4}`]
      }
    ></Viewer>
  </Box>;
}

function Protocol5() {
  const [senderNextFrameToSend5, setSenderNextFrameToSend5] = useState<number>(0);
  const [senderAckExpected5, setSenderAckExpected5] = useState<number>(0);
  const [senderFrameExpected5, setSenderFrameExpected5] = useState<number>(0);
  const [senderR5, setSenderR5] = useState<Frame>(new Frame());
  const [senderBuffer5, setSenderBuffer5] = useState<Packet[]>(() => {
    let result = [];
    for (let i = 0; i < 8; i++) {
      result.push(new Packet());
    }
    return result;
  });
  const [senderNBuffered5, setSenderNBuffered5] = useState<number>(0);
  const [senderI5, setSenderI5] = useState<number>(0);
  const [senderEvent5, setSenderEvent5] = useState<Event | undefined>();
  const senderCode5 = `
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

  const stepSender5 = useCallback((state: ViewerState) => {
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
    const buffer = senderBuffer5;
    const setBuffer = setSenderBuffer5;
    const nBuffered = senderNBuffered5;
    const setNBuffered = setSenderNBuffered5;
    const r = senderR5;
    const setR = setSenderR5;
    const i = senderI5;
    const setI = setSenderI5;
    const event = senderEvent5;
    const setEvent = setSenderEvent5;
    const nextFrameToSend = senderNextFrameToSend5;
    const setNextFrameToSend = setSenderNextFrameToSend5;
    const frameExpected = senderFrameExpected5;
    const setFrameExpected = setSenderFrameExpected5;
    const ackExpected = senderAckExpected5;
    const setAckExpected = setSenderAckExpected5;

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
      let s = new Frame();
      s.info = buffer[nextFrameToSend];
      s.seq = nextFrameToSend;
      s.ack = (frameExpected + 7) % (7 + 1);
      setDataLinkToPhysical(dataLinkToPhysical.concat([s]));
      setRow(42);
    } else if (row === 42) {
      // inc(next_frame_to_send);
      setNextFrameToSend((nextFrameToSend + 1) % (7 + 1));
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
      setFrameExpected((frameExpected + 1) % (7 + 1));
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
      setAckExpected((ackExpected + 1) % (7 + 1));
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
      let s = new Frame();
      s.info = buffer[nextFrameToSend];
      s.seq = nextFrameToSend;
      s.ack = (frameExpected + 7) % (7 + 1);
      setDataLinkToPhysical(dataLinkToPhysical.concat([s]));
      setRow(70);
    } else if (row === 70) {
      // inc(next_frame_to_send);
      setNextFrameToSend((nextFrameToSend + 1) % (7 + 1));
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
      if (nBuffered < 7) {
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
  }, [senderNextFrameToSend5, senderAckExpected5, senderFrameExpected5, senderR5, senderBuffer5, senderNBuffered5, senderI5, senderEvent5]);

  const canStepSender5 = useCallback((state: ViewerState) => {
    const row = state.senderRow;
    const networkToDataLink = state.senderNetworkToDataLink;
    const dataLinkEvent = state.senderDataLinkEvent;
    const physicalToDataLink = state.senderPhysicalToDataLink;

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

  const [receiverNextFrameToSend5, setReceiverNextFrameToSend5] = useState<number>(0);
  const [receiverAckExpected5, setReceiverAckExpected5] = useState<number>(0);
  const [receiverFrameExpected5, setReceiverFrameExpected5] = useState<number>(0);
  const [receiverR5, setReceiverR5] = useState<Frame>(new Frame());
  const [receiverBuffer5, setReceiverBuffer5] = useState<Packet[]>(() => {
    let result = [];
    for (let i = 0; i < 8; i++) {
      result.push(new Packet());
    }
    return result;
  });
  const [receiverNBuffered5, setReceiverNBuffered5] = useState<number>(0);
  const [receiverI5, setReceiverI5] = useState<number>(0);
  const [receiverEvent5, setReceiverEvent5] = useState<Event | undefined>();
  const receiverCode5 = senderCode5;

  const stepReceiver5 = useCallback((state: ViewerState) => {
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
    const buffer = receiverBuffer5;
    const setBuffer = setReceiverBuffer5;
    const nBuffered = receiverNBuffered5;
    const setNBuffered = setReceiverNBuffered5;
    const r = receiverR5;
    const setR = setReceiverR5;
    const i = receiverI5;
    const setI = setReceiverI5;
    const event = receiverEvent5;
    const setEvent = setReceiverEvent5;
    const nextFrameToSend = receiverNextFrameToSend5;
    const setNextFrameToSend = setReceiverNextFrameToSend5;
    const frameExpected = receiverFrameExpected5;
    const setFrameExpected = setReceiverFrameExpected5;
    const ackExpected = receiverAckExpected5;
    const setAckExpected = setReceiverAckExpected5;

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
      let s = new Frame();
      s.info = buffer[nextFrameToSend];
      s.seq = nextFrameToSend;
      s.ack = (frameExpected + 7) % (7 + 1);
      setDataLinkToPhysical(dataLinkToPhysical.concat([s]));
      setRow(42);
    } else if (row === 42) {
      // inc(next_frame_to_send);
      setNextFrameToSend((nextFrameToSend + 1) % (7 + 1));
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
      setFrameExpected((frameExpected + 1) % (7 + 1));
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
      setAckExpected((ackExpected + 1) % (7 + 1));
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
      let s = new Frame();
      s.info = buffer[nextFrameToSend];
      s.seq = nextFrameToSend;
      s.ack = (frameExpected + 7) % (7 + 1);
      setDataLinkToPhysical(dataLinkToPhysical.concat([s]));
      setRow(70);
    } else if (row === 70) {
      // inc(next_frame_to_send);
      setNextFrameToSend((nextFrameToSend + 1) % (7 + 1));
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
      if (nBuffered < 7) {
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
  }, [receiverNextFrameToSend5, receiverAckExpected5, receiverFrameExpected5, receiverR5, receiverBuffer5, receiverNBuffered5, receiverI5, receiverEvent5]);

  const canStepReceiver5 = useCallback((state: ViewerState) => {
    const row = state.receiverRow;
    const networkToDataLink = state.receiverNetworkToDataLink;
    const dataLinkEvent = state.receiverDataLinkEvent;
    const physicalToDataLink = state.receiverPhysicalToDataLink;

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
      initialSenderRow={28} senderCode={senderCode5}
      stepSender={stepSender5} canStepSender={canStepSender5}
      senderLocals={
        [`next_frame_to_send: ${senderNextFrameToSend5}`,
        `ack_expected: ${senderAckExpected5}`,
        `frame_expected: ${senderFrameExpected5}`,
        `r: ${senderR5}`,
        `buffer: ${senderBuffer5}`,
        `nbuffered: ${senderNBuffered5}`,
        `i: ${senderI5}`,
        `event: ${senderEvent5}`]
      }
      initialReceiverRow={28} receiverCode={receiverCode5}
      stepReceiver={stepReceiver5} canStepReceiver={canStepReceiver5}
      receiverLocals={
        [`next_frame_to_send: ${receiverNextFrameToSend5}`,
        `ack_expected: ${receiverAckExpected5}`,
        `frame_expected: ${receiverFrameExpected5}`,
        `r: ${receiverR5}`,
        `buffer: ${receiverBuffer5}`,
        `nbuffered: ${receiverNBuffered5}`,
        `i: ${receiverI5}`,
        `event: ${receiverEvent5}`]
      }
    ></Viewer>
  </Box>;
}

function App() {

  return (
    <Container maxWidth={false}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Paper sx={{
            padding: '30px',
          }}>
            <Typography variant="h3">
              数据链路层协议
            </Typography>
            <Typography>
              在学习《计算机网络原理》课程时，数据链路层协议是一个重难点。为了理解《计算机网络》教材上讲述的数据链路层协议，你可以在本页面中观察各个数据链路层协议的工作方式。
            </Typography>
          </Paper>
        </Grid>
        <Protocol1 />
        <Protocol2 />
        <Protocol3 />
        <Protocol4 />
        <Protocol5 />
      </Grid>
    </Container>
  );
}

export default App;

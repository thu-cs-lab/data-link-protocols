import { useCallback, useState } from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { Viewer, ViewerState } from './Viewer';
import { Frame, Packet, Event, STALL_FROM_NETWORK_LAYER, STALL_FROM_PHYSICAL_LAYER, STALL_WAIT_FOR_EVENT, EventType } from './Common';

export function Protocol3() {
  const [senderNextFrameToSend3, setSenderNextFrameToSend3] = useState<number>(0);
  const [senderS3, setSenderS3] = useState<Frame>(new Frame());
  const [senderBuffer3, setSenderBuffer3] = useState<Packet>(new Packet());
  const [senderEvent3, setSenderEvent3] = useState<EventType | undefined>();
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
  const [receiverEvent3, setReceiverEvent3] = useState<EventType | undefined>();
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
      hideAddAckTimeoutEventButton={true}
    ></Viewer>

  </Box>;
}

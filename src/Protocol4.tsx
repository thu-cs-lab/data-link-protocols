import { useCallback, useState } from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { Viewer, ViewerState } from './Viewer';
import { Frame, Packet, Event, STALL_FROM_NETWORK_LAYER, STALL_FROM_PHYSICAL_LAYER, STALL_WAIT_FOR_EVENT, EventType } from './Common';

export function Protocol4() {
  const [senderNextFrameToSend4, setSenderNextFrameToSend4] = useState<number>(0);
  const [senderFrameExpected4, setSenderFrameExpected4] = useState<number>(0);
  const [senderR4, setSenderR4] = useState<Frame>(new Frame());
  const [senderS4, setSenderS4] = useState<Frame>(new Frame());
  const [senderBuffer4, setSenderBuffer4] = useState<Packet>(new Packet());
  const [senderEvent4, setSenderEvent4] = useState<EventType | undefined>();
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
    const { row, setRow, dataLinkEvent, setDataLinkEvent, dataLinkToPhysical, setDataLinkToPhysical, physicalToDataLink, setPhysicalToDataLink, dataLinkToNetwork, setDataLinkToNetwork, networkToDataLink, setNetworkToDataLink } = state;
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
    const { row, dataLinkEvent, physicalToDataLink, networkToDataLink } = state;

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
  const [receiverEvent4, setReceiverEvent4] = useState<EventType | undefined>();
  const receiverCode4 = senderCode4;

  const stepReceiver4 = useCallback((state: ViewerState) => {
    const { row, setRow, dataLinkEvent, setDataLinkEvent, dataLinkToPhysical, setDataLinkToPhysical, physicalToDataLink, setPhysicalToDataLink, dataLinkToNetwork, setDataLinkToNetwork, networkToDataLink, setNetworkToDataLink } = state;
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
    const { row, dataLinkEvent, physicalToDataLink, networkToDataLink } = state;

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
      hideAddAckTimeoutEventButton={true}
    ></Viewer>
  </Box>;
}

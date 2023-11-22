import { useCallback, useState } from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { Viewer, ViewerState } from './Viewer';
import { Frame, Packet, STALL_FROM_NETWORK_LAYER, STALL_FROM_PHYSICAL_LAYER, STALL_WAIT_FOR_EVENT, EventType } from './Common';

export function Protocol1() {
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
  const [receiverEvent1, setReceiverEvent1] = useState<EventType | undefined>();
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

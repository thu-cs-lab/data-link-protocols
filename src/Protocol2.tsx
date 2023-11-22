import { useCallback, useState } from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { Viewer, ViewerState } from './Viewer';
import { Frame, Packet, STALL_FROM_NETWORK_LAYER, STALL_FROM_PHYSICAL_LAYER, STALL_WAIT_FOR_EVENT, EventType } from './Common';

function Sender() {
  const [s, setS] = useState<Frame>(new Frame());
  const [buffer, setBuffer] = useState<Packet>(new Packet());
  const [event, setEvent] = useState<EventType | undefined>();
  const code = `
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

  const step = useCallback((state: ViewerState) => {
    const row = state.senderRow;
    const setRow = state.setSenderRow;
    const networkToDataLink = state.senderNetworkToDataLink;
    const setNetworkToDataLink = state.setSenderNetworkToDataLink;
    const dataLinkToPhysical = state.senderDataLinkToPhysical;
    const setDataLinkToPhysical = state.setSenderDataLinkToPhysical;
    const dataLinkEvent = state.senderDataLinkEvent;
    const setDataLinkEvent = state.setSenderDataLinkEvent;

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
  }, [s, buffer]);

  const canStep = useCallback((state: ViewerState) => {
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


  return {
    initialRow: 4,
    code: code,
    step: step,
    canStep: canStep,
    locals:
      [`s: ${s}`, `buffer: ${buffer}`, `event: ${event}`]
  }
}

function Receiver() {
  const [r, setR] = useState<Frame>(new Frame());
  const [s] = useState<Frame>(new Frame());
  const [event, setEvent] = useState<EventType | undefined>();
  const code = `
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

  const step = useCallback((state: ViewerState) => {
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
  }, [r, s]);

  const canStep = useCallback((state: ViewerState) => {
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

  return {
    initialRow: 3,
    code: code,
    step: step,
    canStep: canStep,
    locals:
      [`r: ${r}`, `s: ${s}`, `event: ${event}`]
  }
}

export function Protocol2() {
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
          协议二：停止-等待协议（Stop-and-Wait） Protocol 2 (Stop-and-wait)
        </Typography>
        <Typography>
          协议二（停止-等待，简称停等协议）也提供了从发送端到接收端的单向数据流。与协议一一样，依然假设通信信道无差错。但是，这次接收端只有有限的缓冲区容量和有限的处理速度，因此协议必须明确防止发送端以快于接收端能处理的速度，向接收端发送数据。Protocol 2 (Stop-and-wait) also provides for a one-directional flow of data from sender to receiver. The communication channel is once again assumed to be error free, as in protocol 1. However, this time the receiver has only a finite buffer capacity and a finite processing speed, so the protocol must explicitly prevent the sender from flooding the receiver with data faster than it can be handled.
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
      hideAddEventButton={true}
    ></Viewer>
  </Box>;
}

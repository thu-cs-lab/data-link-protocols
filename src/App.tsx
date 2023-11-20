import React, { useCallback, useEffect, useState } from 'react';
import './App.css';
import { Box, Button, Container, Grid, List, ListItem, Paper, TextField, Typography } from '@mui/material';
import { tomorrow as style } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

function AddRowMarker(code: string, line: number | undefined) {
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

class Packet {
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

class Frame {
  constructor(
    public info?: Packet,
    public seq?: number,
    public ack?: number
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

    return `Frame (${entries.join(", ")})`;
  }

  public clone = (): Frame => {
    return new Frame(this.info?.clone(), this.seq, this.ack);
  }
}

enum Event {
  FrameArrival = "Frame Arrival",
  CksumError = "Checksum Error",
  Timeout = "Timeout"
}

const STALL_FROM_NETWORK_LAYER = "没有可以从网络层读取的分组";
const STALL_FROM_PHYSICAL_LAYER = "没有可以从物理层读取的帧";
const STALL_WAIT_FOR_EVENT = "没有新的事件";

type ViewerState = {
  // sender network layer
  senderNetworkToDataLink: Packet[];
  setSenderNetworkToDataLink: (val: Packet[]) => void;

  // sender data link layer
  senderRow: number;
  setSenderRow: (val: number) => void;

  senderDataLinkEvent: Event[];
  setSenderDataLinkEvent: (val: Event[]) => void;

  senderDataLinkToNetwork: Packet[];
  setSenderDataLinkToNetwork: (val: Packet[]) => void;

  senderDataLinkToPhysical: Frame[];
  setSenderDataLinkToPhysical: (val: Frame[]) => void;

  // sender physical layer
  senderPhysicalToDataLink: Frame[];
  setSenderPhysicalToDataLink: (val: Frame[]) => void;

  // receiver physical layer
  receiverPhysicalToDataLink: Frame[];
  setReceiverPhysicalToDataLink: (val: Frame[]) => void;

  // receiver data link layer
  receiverRow: number;
  setReceiverRow: (val: number) => void;

  receiverDataLinkToPhysical: Frame[];
  setReceiverDataLinkToPhysical: (val: Frame[]) => void;

  receiverDataLinkEvent: Event[];
  setReceiverDataLinkEvent: (val: Event[]) => void;

  receiverDataLinkToNetwork: Packet[];
  setReceiverDataLinkToNetwork: (val: Packet[]) => void;

  // receiver network layer
  receiverNetworkToDataLink: Packet[];
  setReceiverNetworkToDataLink: (val: Packet[]) => void;
};

interface HasToString {
  toString: () => string;
}

type MyListProps = {
  entries: HasToString[];
  hide?: boolean;
  description: string;
};

function MyList(props: MyListProps) {
  return props.hide ? null : <Box>
    <Typography>
      {props.description}
    </Typography>
    <List>
      {
        props.entries.map((entry) => {
          return <ListItem>
            {entry.toString()}
          </ListItem>;
        })
      }
    </List>
  </Box>;
}

type ViewerProps = {
  initialSenderRow: number;
  initialReceiverRow: number;

  senderCode: string;
  receiverCode: string;

  stepSender: (state: ViewerState) => void;
  stepReceiver: (state: ViewerState) => void;

  // return undefined if stepping is allowed
  // otherwise return message why stepping is not allowed
  canStepSender: (state: ViewerState) => string | undefined;
  canStepReceiver: (state: ViewerState) => string | undefined;

  senderLocals: HasToString[];
  receiverLocals: HasToString[];

  hideSenderPhysicalToDataLink?: boolean;
  hideSenderDataLinkToNetwork?: boolean;
  hideSenderDataLinkEvent?: boolean;
  hideReceiverDataLinkToPhysical?: boolean;
  hideReceiverNetworkToDataLink?: boolean;
  hideReceiverNetworkInput?: boolean;
};

function FastForwarder(canStep: () => boolean, step: () => void) {
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

function Viewer(props: ViewerProps) {
  // sender network layer
  // sender network -> sender data link
  const [senderNetworkToDataLink, setSenderNetworkToDataLink] = useState<Packet[]>([]);
  // user input for sender network
  const [senderNetworkInput, setSenderNetworkInput] = useState("");
  const senderSendNetwork = useCallback(() => {
    const packet: Packet = new Packet(senderNetworkInput);
    setSenderNetworkToDataLink(senderNetworkToDataLink.concat(packet));
  }, [senderNetworkToDataLink, senderNetworkInput]);
  // sender data link -> sender network
  const [senderDataLinkToNetwork, setSenderDataLinkToNetwork] = useState<Packet[]>([]);

  // sender data link layer
  const [senderRow, setSenderRow] = useState(props.initialSenderRow);
  const senderCode = AddRowMarker(props.senderCode, senderRow);
  const [senderDataLinkEvent, setSenderDataLinkEvent] = useState<Event[]>([]);
  // sender data link -> sender physical
  const [senderDataLinkToPhysical, setSenderDataLinkToPhysical] = useState<Frame[]>([]);
  // sender physical -> sender data link
  const [senderPhysicalToDataLink, setSenderPhysicalToDataLink] = useState<Frame[]>([]);

  // sender & receiver physical layer
  // sender physical -> receiver physical is implicit
  // receiver physical -> receiver data link
  const [receiverPhysicalToDataLink, setReceiverPhysicalToDataLink] = useState<Frame[]>([]);

  // receiver data link layer
  const [receiverRow, setReceiverRow] = useState(props.initialReceiverRow);
  const receiverCode = AddRowMarker(props.receiverCode, receiverRow);
  const [receiverDataLinkEvent, setReceiverDataLinkEvent] = useState<Event[]>([]);
  // receiver data link -> receiver physical
  const [receiverDataLinkToPhysical, setReceiverDataLinkToPhysical] = useState<Frame[]>([]);
  // receiver data link -> receiver network
  const [receiverDataLinkToNetwork, setReceiverDataLinkToNetwork] = useState<Packet[]>([]);

  // receiver network layer
  // receiver network -> receiver data link
  const [receiverNetworkToDataLink, setReceiverNetworkToDataLink] = useState<Packet[]>([]);
  // user input for receiver network
  const [receiverNetworkInput, setReceiverNetworkInput] = useState("");
  const receiverSendNetwork = useCallback(() => {
    const packet: Packet = new Packet(receiverNetworkInput);
    setReceiverNetworkToDataLink(receiverNetworkToDataLink.concat(packet));
  }, [receiverNetworkToDataLink, receiverNetworkInput]);

  // sender physical -> receiver physical
  const sendSenderPhysical = useCallback(() => {
    setReceiverPhysicalToDataLink(receiverPhysicalToDataLink.concat(senderDataLinkToPhysical[0]));
    setSenderDataLinkToPhysical(senderDataLinkToPhysical.slice(1));
    setReceiverDataLinkEvent(receiverDataLinkEvent.concat([Event.FrameArrival]))
  }, [receiverPhysicalToDataLink, senderDataLinkToPhysical, receiverDataLinkEvent]);

  // receiver physical -> sender physical
  const sendReceiverPhysical = useCallback(() => {
    setSenderPhysicalToDataLink(senderPhysicalToDataLink.concat(receiverDataLinkToPhysical[0]));
    setReceiverDataLinkToPhysical(receiverDataLinkToPhysical.slice(1));
    setSenderDataLinkEvent(senderDataLinkEvent.concat([Event.FrameArrival]))
  }, [senderPhysicalToDataLink, receiverDataLinkToPhysical, senderDataLinkEvent]);

  // fast forward
  const fastForwardSender = FastForwarder(() => props.canStepSender(state) === undefined, () => props.stepSender(state));
  const fastForwardReceiver = FastForwarder(() => props.canStepReceiver(state) === undefined, () => props.stepReceiver(state));

  const state: ViewerState = {
    senderRow: senderRow,
    setSenderRow: setSenderRow,

    receiverRow: receiverRow,
    setReceiverRow: setReceiverRow,

    senderNetworkToDataLink: senderNetworkToDataLink,
    setSenderNetworkToDataLink: setSenderNetworkToDataLink,

    senderDataLinkToNetwork: senderDataLinkToNetwork,
    setSenderDataLinkToNetwork: setSenderDataLinkToNetwork,

    senderDataLinkEvent: senderDataLinkEvent,
    setSenderDataLinkEvent: setSenderDataLinkEvent,

    senderDataLinkToPhysical: senderDataLinkToPhysical,
    setSenderDataLinkToPhysical: setSenderDataLinkToPhysical,

    senderPhysicalToDataLink: senderPhysicalToDataLink,
    setSenderPhysicalToDataLink: setSenderPhysicalToDataLink,

    receiverPhysicalToDataLink: receiverPhysicalToDataLink,
    setReceiverPhysicalToDataLink: setReceiverPhysicalToDataLink,

    receiverDataLinkToPhysical: receiverDataLinkToPhysical,
    setReceiverDataLinkToPhysical: setReceiverDataLinkToPhysical,

    receiverDataLinkEvent: receiverDataLinkEvent,
    setReceiverDataLinkEvent: setReceiverDataLinkEvent,

    receiverDataLinkToNetwork: receiverDataLinkToNetwork,
    setReceiverDataLinkToNetwork: setReceiverDataLinkToNetwork,

    receiverNetworkToDataLink: receiverNetworkToDataLink,
    setReceiverNetworkToDataLink: setReceiverNetworkToDataLink
  };

  const style1 = {
    padding: '20px'
  };
  const style2 = {
    padding: '10px',
    marginTop: '10px'
  };

  return <Grid container spacing={2} sx={{
    paddingTop: '30px',
    paddingBottom: '30px',
  }}>
    <Grid item xs={6}>
      <Paper sx={style1}>
        <Typography variant="h4">
          发送方
        </Typography>
        <Paper sx={style2}>
          <Typography variant="h5">
            网络层
          </Typography>
          <Typography>
            你可以在这里输入载荷的内容，点击发送，模拟发送方网络层要发送数据的情况：
          </Typography>
          <TextField label="载荷" variant="outlined" fullWidth onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setSenderNetworkInput(event.target.value);
          }} />
          <Button variant="contained" onClick={senderSendNetwork}>发送</Button>
          <MyList description='以下是网络层发送给数据链路层，但数据链路层还没有接收的分组：'
            entries={senderNetworkToDataLink}></MyList>
          <MyList description='以下是数据链路层发送给网络层的分组：'
            hide={props.hideSenderDataLinkToNetwork}
            entries={senderDataLinkToNetwork}></MyList>
        </Paper>
        <Paper sx={style2}>
          <Typography variant="h5">
            数据链路层
          </Typography>
          <Typography>
            发送方代码：
          </Typography>
          <SyntaxHighlighter language="javascript" style={style}>
            {senderCode}
          </SyntaxHighlighter>
          <Button variant="contained" onClick={() => props.stepSender(state)} disabled={props.canStepSender(state) !== undefined}>下一步</Button>
          <Button variant="contained" onClick={fastForwardSender} disabled={props.canStepSender(state) !== undefined}>下一步直到无法立即继续</Button>
          <Typography>
            {props.canStepSender(state)}
          </Typography>
          <MyList description='局部变量：'
            entries={props.senderLocals}></MyList>
          <MyList description='以下是数据链路层尚未处理的事件：'
            hide={props.hideSenderDataLinkEvent}
            entries={senderDataLinkEvent}></MyList>
        </Paper>
        <Paper sx={style2}>
          <Typography variant="h5">
            物理层
          </Typography>
          <MyList description='以下是物理层发送给数据链路层，但是数据链路层还没有接收的帧：'
            hide={props.hideSenderPhysicalToDataLink}
            entries={senderPhysicalToDataLink}></MyList>
          <MyList description='以下是数据链路层发送给物理层，但是物理层还没有发送的帧：'
            entries={senderDataLinkToPhysical}></MyList>
          <Button variant="contained" onClick={sendSenderPhysical} disabled={senderDataLinkToPhysical.length === 0}>发送</Button>
        </Paper>
      </Paper>
    </Grid>
    <Grid item xs={6}>
      <Paper sx={style1}>
        <Typography variant="h4">
          接收方
        </Typography>
        <Paper sx={style2}>
          <Typography variant="h5">
            网络层
          </Typography>
          {
            props.hideReceiverNetworkInput ? null : <Box>
              <Typography>
                你可以在这里输入载荷的内容，点击发送，模拟接收方网络层要发送数据的情况：
              </Typography>
              <TextField label="载荷" variant="outlined" fullWidth onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setReceiverNetworkInput(event.target.value);
              }} />
              <Button variant="contained" onClick={receiverSendNetwork}>发送</Button>
            </Box>
          }
          <MyList description='以下是网络层发送给数据链路层，但数据链路层还没有接收的分组：'
            hide={props.hideReceiverNetworkToDataLink}
            entries={receiverNetworkToDataLink}></MyList>
          <MyList description='以下是数据链路层发送给网络层的分组：'
            entries={receiverDataLinkToNetwork}></MyList>
        </Paper>
        <Paper sx={style2}>
          <Typography variant="h5">
            数据链路层
          </Typography>
          <Typography>
            接收方代码：
          </Typography>
          <SyntaxHighlighter language="javascript" style={style}>
            {receiverCode}
          </SyntaxHighlighter>
          <Button variant="contained" onClick={() => props.stepReceiver(state)} disabled={props.canStepReceiver(state) !== undefined}>下一步</Button>
          <Button variant="contained" onClick={fastForwardReceiver} disabled={props.canStepReceiver(state) !== undefined}>下一步直到无法立即继续</Button>
          <Typography>
            {props.canStepReceiver(state)}
          </Typography>
          <MyList description='局部变量：'
            entries={props.receiverLocals}></MyList>
          <MyList description='以下是数据链路层尚未处理的事件：'
            entries={receiverDataLinkEvent}></MyList>
        </Paper>
        <Paper sx={style2}>
          <Typography variant="h5">
            物理层
          </Typography>
          <MyList description='以下是物理层发送给数据链路层，但是数据链路层还没有接收的帧：'
            entries={receiverPhysicalToDataLink}></MyList>
          <MyList description='以下是数据链路层发送给物理层，但是物理层还没有发送的帧：'
            hide={props.hideReceiverDataLinkToPhysical}
            entries={receiverDataLinkToPhysical}></MyList>
          {
            props.hideReceiverDataLinkToPhysical ? null :
              <Button variant="contained" onClick={sendReceiverPhysical} disabled={receiverDataLinkToPhysical.length === 0}>发送</Button>
          }
        </Paper>
      </Paper>
    </Grid>
  </Grid>
}

function App() {
  // frame s;
  const [senderS1, setSenderS1] = useState<Frame>(new Frame());
  // packet buffer;
  const [senderBuffer1, setSenderBuffer1] = useState<Packet>(new Packet());
  const senderCode1 = `
  void sender1(void)
  {
    frame s;                        /* buffer for an outbound frame */
    packet buffer;                  /* buffer for an outbound packet */
    while (true) {
      from_network_layer(&buffer);  /* go get something to send */
      s.info = buffer;              /* copy it into s for transmission */
      to_physical_layer(&s);        /* send it on its way */
    }
  }`;

  const stepSender1 = useCallback((state: ViewerState) => {
    if (state.senderRow === 4) {
      // while (true) {
      state.setSenderRow(5);
    } else if (state.senderRow === 5 && state.senderNetworkToDataLink.length > 0) {
      // from_network_layer(&buffer);
      state.setSenderRow(6);
      setSenderBuffer1(state.senderNetworkToDataLink[0]);
      state.setSenderNetworkToDataLink(state.senderNetworkToDataLink.slice(1));
    } else if (state.senderRow === 6) {
      // s.info = buffer;
      setSenderS1(senderS1.withInfo(senderBuffer1));
      state.setSenderRow(7);
    } else if (state.senderRow === 7) {
      // to_physical_layer(&s);
      state.setSenderRow(8);
      state.setSenderDataLinkToPhysical(state.senderDataLinkToPhysical.concat(senderS1));
    } else if (state.senderRow === 8) {
      // }
      state.setSenderRow(4);
    }
  }, [senderS1, senderBuffer1]);

  const canStepSender1 = useCallback((state: ViewerState) => {
    if (state.senderRow === 5 && state.senderNetworkToDataLink.length === 0) {
      // from_network_layer(&buffer);
      return STALL_FROM_NETWORK_LAYER;
    } else {
      return undefined;
    }
  }, []);

  const [receiverR1, setReceiverR1] = useState<Frame>(new Frame());
  const [receiverEvent1, setReceiverEvent1] = useState<Event | undefined>();
  const receiverCode1 = `
  void receiver1(void)
  {
    frame r;
    event_type event;                        /* filled in by wait, but not used here */
    while (true) {
      wait_for_event(&event);                /* only possibility is frame_arrival */
      from_physical_layer(&r);               /* go get the inbound frame */
      to_network_layer(&r.info);            /* pass the data to the network layer */
    }
  }`;

  const stepReceiver1 = useCallback((state: ViewerState) => {
    if (state.receiverRow === 4) {
      // while (true) {
      state.setReceiverRow(5);
    } else if (state.receiverRow === 5 && state.receiverDataLinkEvent.length > 0) {
      // wait_for_event(&event);
      state.setReceiverRow(6);
      setReceiverEvent1(state.receiverDataLinkEvent[0]);
      state.setReceiverDataLinkEvent(state.receiverDataLinkEvent.slice(1));
    } else if (state.receiverRow === 6 && state.receiverPhysicalToDataLink.length > 0) {
      // from_physical_layer(&r);
      state.setReceiverRow(7);
      setReceiverR1(state.receiverPhysicalToDataLink[0]);
      state.setReceiverPhysicalToDataLink(state.receiverPhysicalToDataLink.slice(1));
    } else if (state.receiverRow === 7) {
      // to_network_layer(&r.info);
      state.setReceiverRow(8);
      state.setReceiverDataLinkToNetwork(state.receiverDataLinkToNetwork.concat([receiverR1.info!]));
    } else if (state.receiverRow === 8) {
      // }
      state.setReceiverRow(4);
    }
  }, [receiverR1]);

  const canStepReceiver1 = useCallback((state: ViewerState) => {
    if (state.receiverRow === 5 && state.receiverDataLinkEvent.length === 0) {
      // wait_for_event(&event);
      return STALL_WAIT_FOR_EVENT;
    } else if (state.receiverRow === 6 && state.receiverPhysicalToDataLink.length === 0) {
      // from_physical_layer(&r);
      return STALL_FROM_PHYSICAL_LAYER;
    } else {
      return undefined;
    }
  }, []);

  const [senderS2, setSenderS2] = useState<Frame>(new Frame());
  const [senderBuffer2, setSenderBuffer2] = useState<Packet>(new Packet());
  const [senderEvent2, setSenderEvent2] = useState<Event | undefined>();
  const senderCode2 = `
  void sender2(void)
  {
    frame s;                       /* buffer for an outbound frame */
    packet buffer;                 /* buffer for an outbound packet */
    while (true) {
      from_network_layer(&buffer); /* go get something to send */
      s.info = buffer;             /* copy it into s for transmission */
      to_physical_layer(&s);       /* bye-byte little frame */
      wait_for_event(&event);      /* do not proceed until given the go ahead */
    }
  }`;

  const stepSender2 = useCallback((state: ViewerState) => {
    if (state.senderRow === 4) {
      // while (true) {
      state.setSenderRow(5);
    } else if (state.senderRow === 5 && state.senderNetworkToDataLink.length > 0) {
      // from_network_layer(&buffer);
      state.setSenderRow(6);
      setSenderBuffer2(state.senderNetworkToDataLink[0]);
      state.setSenderNetworkToDataLink(state.senderNetworkToDataLink.slice(1));
    } else if (state.senderRow === 6) {
      // s.info = buffer;
      setSenderS2(senderS2.withInfo(senderBuffer2));
      state.setSenderRow(7);
    } else if (state.senderRow === 7) {
      // to_physical_layer(&s);
      state.setSenderRow(8);
      state.setSenderDataLinkToPhysical(state.senderDataLinkToPhysical.concat(senderS2));
    } else if (state.senderRow === 8 && state.senderDataLinkEvent.length > 0) {
      // wait_for_event(&event);
      state.setSenderRow(9);
      setSenderEvent2(state.senderDataLinkEvent[0]);
      state.setSenderDataLinkEvent(state.senderDataLinkEvent.slice(1));
    } else if (state.senderRow === 9) {
      // }
      state.setSenderRow(4);
    }
  }, [senderS2, senderBuffer2]);

  const canStepSender2 = useCallback((state: ViewerState) => {
    if (state.senderRow === 5 && state.senderNetworkToDataLink.length === 0) {
      // from_network_layer(&buffer);
      return STALL_FROM_NETWORK_LAYER;
    } else if (state.senderRow === 8 && state.senderDataLinkEvent.length === 0) {
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
  void receiver2(void)
  {
    frame r, s;                  /* buffers for frames */
    event_type event;            /* frame_arrival is the only possibility */
    while (true) {
      wait_for_event(&event);    /* only possibility is frame_arrival */
      from_physical_layer(&r);   /* go get the inbound frame */
      to_network_layer(&r.info); /* pass the data to the network layer */
      to_physical_layer(&s);     /* send a dummy frame to awaken sender */
    }
  }`;

  const stepReceiver2 = useCallback((state: ViewerState) => {
    if (state.receiverRow === 4) {
      // while (true) {
      state.setReceiverRow(5);
    } else if (state.receiverRow === 5 && state.receiverDataLinkEvent.length > 0) {
      // wait_for_event(&event);
      setReceiverEvent2(state.receiverDataLinkEvent[0]);
      state.setReceiverDataLinkEvent(state.receiverDataLinkEvent.slice(1));
      state.setReceiverRow(6);
    } else if (state.receiverRow === 6 && state.receiverPhysicalToDataLink.length > 0) {
      // from_physical_layer(&r);
      setReceiverR2(state.receiverPhysicalToDataLink[0]);
      state.setReceiverPhysicalToDataLink(state.receiverPhysicalToDataLink.slice(1));
      state.setReceiverRow(7);
    } else if (state.receiverRow === 7) {
      // to_network_layer(&r.info);
      state.setReceiverDataLinkToNetwork(state.receiverDataLinkToNetwork.concat([receiverR2.info!]));
      state.setReceiverRow(8);
    } else if (state.receiverRow === 8) {
      // to_physical_layer(&s);
      state.setReceiverDataLinkToPhysical(state.receiverDataLinkToPhysical.concat([receiverS2]));
      state.setReceiverRow(9);
    } else if (state.receiverRow === 9) {
      // }
      state.setReceiverRow(4);
    }
  }, [receiverR2, receiverS2]);

  const canStepReceiver2 = useCallback((state: ViewerState) => {
    if (state.receiverRow === 5 && state.receiverDataLinkEvent.length === 0) {
      // wait_for_event(&event);
      return STALL_WAIT_FOR_EVENT;
    } else if (state.receiverRow === 6 && state.receiverPhysicalToDataLink.length === 0) {
      // from_physical_layer(&r);
      return STALL_FROM_PHYSICAL_LAYER;
    } else {
      return undefined;
    }
  }, []);

  const [senderNextFrameToSend3, setSenderNextFrameToSend3] = useState<number>(0);
  const [senderS3, setSenderS3] = useState<Frame>(new Frame());
  const [senderBuffer3, setSenderBuffer3] = useState<Packet>(new Packet());
  const [senderEvent3, setSenderEvent3] = useState<Event | undefined>();
  const senderCode3 = `
  void sender3(void)
  {
    seq_nr next_frame_to_send;             /* seq number of next outgoing frame */
    frame s;                               /* scratch variable */
    packet buffer;                         /* buffer for an outbound packet */
    event_type event;
  
    next_frame_to_send = 0;                /* initialize outbound sequence numbers */
    from_network_layer(&buffer);           /* fetch first packet */
    while(true) {
      s.info = buffer;                     /* construct a frame for transmission */
      s.seq = next_frame_to_send;          /* insert sequence number in frame */
      to_physical_layer(&s);               /* send it on its way */
      start_timer(s.seq);                  /* if answer takes too long */
      wait_for_event(&event);              /* frame_arrival, cksum_err, timeout */
      if (event == frame_arrival) {
        from_physical_layer(&s);           /* get the acknowledgement */
        if (s.ack == next_frame_to_send) {
          stop_timer(s.ack);               /* turn the timer off */
          from_network_layer(&buffer);     /* get the next one to send */
          inc(next_frame_to_send);         /* invert next_frame_to_send */
        }
      }
    }
  }`;

  const stepSender3 = useCallback((state: ViewerState) => {
    if (state.senderRow === 7) {
      // next_frame_to_send = 0;
      setSenderNextFrameToSend3(0);
      state.setSenderRow(8);
    } else if (state.senderRow === 8 && state.senderNetworkToDataLink.length > 0) {
      // from_network_layer(&buffer);
      setSenderBuffer3(state.senderNetworkToDataLink[0]);
      state.setSenderNetworkToDataLink(state.senderNetworkToDataLink.slice(1));
      state.setSenderRow(9);
    } else if (state.senderRow === 9) {
      // while(true) {
      state.setSenderRow(10);
    } else if (state.senderRow === 10) {
      // s.info = buffer;
      setSenderS3(senderS3.withInfo(senderBuffer3));
      state.setSenderRow(11);
    } else if (state.senderRow === 11) {
      // s.seq = next_frame_to_send;
      setSenderS3(senderS3.withSeq(senderNextFrameToSend3));
      state.setSenderRow(12);
    } else if (state.senderRow === 12) {
      // to_physical_layer(&s);
      state.setSenderDataLinkToPhysical(state.senderDataLinkToPhysical.concat(senderS3));
      state.setSenderRow(13);
    } else if (state.senderRow === 13) {
      // start_timer(s.seq);
      state.setSenderRow(14);
    } else if (state.senderRow === 14 && state.senderDataLinkEvent.length > 0) {
      // wait_for_event(&event);
      setSenderEvent3(state.senderDataLinkEvent[0]);
      state.setSenderDataLinkEvent(state.senderDataLinkEvent.slice(1));
      state.setSenderRow(15);
    } else if (state.senderRow === 15) {
      // if (event == frame_arrival) {
      if (senderEvent3 === Event.FrameArrival) {
        state.setSenderRow(16);
      } else {
        state.setSenderRow(22);
      }
    } else if (state.senderRow === 16 && state.senderPhysicalToDataLink.length > 0) {
      // from_physical_layer(&s);
      setSenderS3(state.senderPhysicalToDataLink[0]);
      state.setSenderPhysicalToDataLink(state.senderPhysicalToDataLink.slice(1));
      state.setSenderRow(17);
    } else if (state.senderRow === 17) {
      // if (s.ack == next_frame_to_send) {
      if (senderS3.ack === senderNextFrameToSend3) {
        state.setSenderRow(18);
      } else {
        state.setSenderRow(21);
      }
    } else if (state.senderRow === 18) {
      // stop_timer(s.ack);
      state.setSenderRow(19);
    } else if (state.senderRow === 19 && state.senderNetworkToDataLink.length > 0) {
      // from_network_layer(&buffer);
      setSenderBuffer3(state.senderNetworkToDataLink[0]);
      state.setSenderNetworkToDataLink(state.senderNetworkToDataLink.slice(1))
      state.setSenderRow(20);
    } else if (state.senderRow === 20) {
      // inc(next_frame_to_send);
      setSenderNextFrameToSend3(1 - senderNextFrameToSend3);
      state.setSenderRow(21);
    } else if (state.senderRow === 21) {
      // }
      state.setSenderRow(22);
    } else if (state.senderRow === 22) {
      // }
      state.setSenderRow(23);
    } else if (state.senderRow === 23) {
      // }
      state.setSenderRow(9);
    }
  }, [senderNextFrameToSend3, senderS3, senderBuffer3, senderEvent3]);

  const canStepSender3 = useCallback((state: ViewerState) => {
    if (state.senderRow === 8 && state.senderNetworkToDataLink.length === 0) {
      // from_network_layer(&buffer);
      return STALL_FROM_NETWORK_LAYER;
    } else if (state.senderRow === 14 && state.senderDataLinkEvent.length === 0) {
      // wait_for_event(&event);
      return STALL_WAIT_FOR_EVENT;
    } else if (state.senderRow === 16 && state.senderPhysicalToDataLink.length === 0) {
      // from_physical_layer(&s);
      return STALL_FROM_PHYSICAL_LAYER;
    } else if (state.senderRow === 19 && state.senderNetworkToDataLink.length === 0) {
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
  void receiver3(void)
  {
    seq_nr frame_expected;
    frame r, s;
    event_type event;
  
    frame_expected = 0;
    while (true) {
      wait_for_event(&event);          /* possibilities: frame_arrival, cksum_err */
      if (event == frame_arrival) {    /* a valid frame has arrived */
        from_physical_layer(&r);       /* go get the newly arrived frame */
        if (r.seq == frame_expected) { /* this is what we have been waiting for */
          to_network_layer(&r.info);   /* pass the data to the network layer */
          inc(frame_expected);         /* next time expect the other sequence nr */
        }
        s.ack = 1 - frame_expected;    /* tell which frame is being acked */
        to_physical_layer(&s);         /* send acknowledgement */
      }
    }
  }`;

  const stepReceiver3 = useCallback((state: ViewerState) => {
    if (state.receiverRow === 6) {
      // frame_expected = 0;
      setReceiverFrameExpected3(0);
      state.setReceiverRow(7);
    } else if (state.receiverRow === 7) {
      // while (true) {
      state.setReceiverRow(8);
    } else if (state.receiverRow === 8 && state.receiverDataLinkEvent.length > 0) {
      // wait_for_event(&event);
      setReceiverEvent3(state.receiverDataLinkEvent[0]);
      state.setReceiverDataLinkEvent(state.receiverDataLinkEvent.slice(1));
      state.setReceiverRow(9);
    } else if (state.receiverRow === 9) {
      // if (event == frame_arrival) {
      if (receiverEvent3 === Event.FrameArrival) {
        state.setReceiverRow(10);
      } else {
        state.setReceiverRow(17);
      }
    } else if (state.receiverRow === 10 && state.receiverPhysicalToDataLink.length > 0) {
      // from_physical_layer(&r);
      setReceiverR3(state.receiverPhysicalToDataLink[0]);
      state.setReceiverPhysicalToDataLink(state.receiverPhysicalToDataLink.slice(1));
      state.setReceiverRow(11);
    } else if (state.receiverRow === 11) {
      // if (r.seq == frame_expected) {
      if (receiverR3.seq === receiverFrameExpected3) {
        state.setReceiverRow(12);
      } else {
        state.setReceiverRow(14);
      }
    } else if (state.receiverRow === 12) {
      // to_network_layer(&r.info);
      state.setReceiverDataLinkToNetwork(state.receiverDataLinkToNetwork.concat([receiverR3.info!]));
      state.setReceiverRow(13);
    } else if (state.receiverRow === 13) {
      // inc(frame_expected);
      setReceiverFrameExpected3(1 - receiverFrameExpected3);
      state.setReceiverRow(14);
    } else if (state.receiverRow === 14) {
      // }
      state.setReceiverRow(15);
    } else if (state.receiverRow === 15) {
      // s.ack = 1 - frame_expected;
      setReceiverS3(receiverS3.withAck(1 - receiverFrameExpected3));
      state.setReceiverRow(16);
    } else if (state.receiverRow === 16) {
      // to_physical_layer(&s);
      state.setReceiverDataLinkToPhysical(state.receiverDataLinkToPhysical.concat([receiverS3]));
      state.setReceiverRow(17);
    } else if (state.receiverRow === 17) {
      // }
      state.setReceiverRow(18);
    } else if (state.receiverRow === 18) {
      // }
      state.setReceiverRow(7);
    }
  }, [receiverFrameExpected3, receiverR3, receiverS3, receiverEvent3]);

  const canStepReceiver3 = useCallback((state: ViewerState) => {
    if (state.receiverRow === 8 && state.receiverDataLinkEvent.length === 0) {
      // wait_for_event(&event);
      return STALL_WAIT_FOR_EVENT;
    } else if (state.receiverRow === 10 && state.receiverPhysicalToDataLink.length === 0) {
      // from_physical_layer(&r);
      return STALL_FROM_PHYSICAL_LAYER;
    } else {
      return undefined;
    }
  }, []);

  const [senderNextFrameToSend4, setSenderNextFrameToSend4] = useState<number>(0);
  const [senderFrameExpected4, setSenderFrameExpected4] = useState<number>(0);
  const [senderR4, setSenderR4] = useState<Frame>(new Frame());
  const [senderS4, setSenderS4] = useState<Frame>(new Frame());
  const [senderBuffer4, setSenderBuffer4] = useState<Packet>(new Packet());
  const [senderEvent4, setSenderEvent4] = useState<Event | undefined>();
  const senderCode4 = `
  void protocol4(void)
  {
    seq_nr next_frame_to_send;             /* 0 or 1 only */
    seq_nr frame_expected;                 /* 0 or 1 only */
    frame r, s;                            /* scratch variables */
    packet buffer;                         /* current packet being sent */
    event_type event;
    next_frame_to_send = 0;                /* next frame on the outbound stream */
    frame_expected = 0;                    /* frame expected next */
    from_network_layer(&buffer);           /* fetch a packet from the network layer */
    s.info = buffer;                       /* prepare to send the initial frame */
    s.seq = next_frame_to_send;            /* insert sequence number info frame */
    s.ack = 1 - frame_expected;            /* piggybacked ack */
    to_physical_layer(&s);                 /* transmit the frame */
    start_timer(s.seq);                    /* start the timer running */
    while (true) {
      wait_for_event(&event);              /* frame_arrival, cksum_err, or timeout */
      if (event == frame_arrival) {        /* a frame has arrived undamaged */
        from_physical_layer(&r);           /* go get it */
        if (r.seq == frame_expected) {     /* handle inbound frame stream */
          to_network_layer(&r.info);       /* pass packet to network layer */
          inc(frame_expected);             /* invert seq number expected next */
        }
        if (r.ack == next_frame_to_send) { /* handle outbound frame stream */
          stop_timer(r.ack);               /* turn the timer off */
          from_network_layer(&buffer);     /* fetch new pkt from network layer */
          inc(next_frame_to_send);         /* invert sender's sequence number */
        }
      }
      s.info = buffer;                     /* construct outbound frame */
      s.seq = next_frame_to_send;          /* insert sequence number into it */
      s.ack = 1 - frame_expected;          /* seq number of last received frame */
      to_physical_layer(&s);               /* transmit a frame */
      start_timer(s.seq);                  /* start the timer running */
    }
  }`;

  const stepSender4 = useCallback((state: ViewerState) => {
    if (state.senderRow === 7) {
      // next_frame_to_send = 0;
      setSenderNextFrameToSend4(0);
      state.setSenderRow(8);
    } else if (state.senderRow === 8) {
      // frame_expected = 0;
      setSenderFrameExpected4(0);
      state.setSenderRow(9);
    } else if (state.senderRow === 9 && state.senderNetworkToDataLink.length > 0) {
      // from_network_layer(&buffer);
      setSenderBuffer4(state.senderNetworkToDataLink[0]);
      state.setSenderNetworkToDataLink(state.senderNetworkToDataLink.slice(1));
      state.setSenderRow(10);
    } else if (state.senderRow === 10) {
      // s.info = buffer;
      setSenderS4(senderS4.withInfo(senderBuffer4));
      state.setSenderRow(11);
    } else if (state.senderRow === 11) {
      // s.seq = next_frame_to_send;
      setSenderS4(senderS4.withSeq(senderNextFrameToSend4));
      state.setSenderRow(12);
    } else if (state.senderRow === 12) {
      // s.ack = 1 - frame_expected;
      setSenderS4(senderS4.withAck(1 - senderFrameExpected4));
      state.setSenderRow(13);
    } else if (state.senderRow === 13) {
      // to_physical_layer(&s);
      state.setSenderDataLinkToPhysical(state.senderDataLinkToPhysical.concat([senderS4]));
      state.setSenderRow(14);
    } else if (state.senderRow === 14) {
      // start_timer(s.seq);
      state.setSenderRow(15);
    } else if (state.senderRow === 15) {
      // while (true) {
      state.setSenderRow(16);
    } else if (state.senderRow === 16 && state.senderDataLinkEvent.length > 0) {
      // wait_for_event(&event);
      setSenderEvent4(state.senderDataLinkEvent[0]);
      state.setSenderDataLinkEvent(state.senderDataLinkEvent.slice(1));
      state.setSenderRow(17);
    } else if (state.senderRow === 17) {
      // if (event == frame_arrival) {
      if (senderEvent4 === Event.FrameArrival) {
        state.setSenderRow(18);
      } else {
        state.setSenderRow(28);
      }
    } else if (state.senderRow === 18 && state.senderPhysicalToDataLink.length > 0) {
      // from_physical_layer(&r);
      setSenderR4(state.senderPhysicalToDataLink[0]);
      state.setSenderPhysicalToDataLink(state.senderPhysicalToDataLink.slice(1));
      state.setSenderRow(19);
    } else if (state.senderRow === 19) {
      // if (r.seq == frame_expected) {
      if (senderR4.seq === senderFrameExpected4) {
        state.setSenderRow(20);
      } else {
        state.setSenderRow(22);
      }
    } else if (state.senderRow === 20) {
      // to_network_layer(&r.info);
      state.setSenderDataLinkToNetwork(state.senderDataLinkToNetwork.concat([senderR4.info!]));
      state.setSenderRow(21);
    } else if (state.senderRow === 21) {
      // inc(frame_expected);
      setSenderFrameExpected4(1 - senderFrameExpected4);
      state.setSenderRow(22);
    } else if (state.senderRow === 22) {
      // }
      state.setSenderRow(23);
    } else if (state.senderRow === 23) {
      // if (r.ack == next_frame_to_send) {
      if (senderR4.ack === senderNextFrameToSend4) {
        state.setSenderRow(24);
      } else {
        state.setSenderRow(27);
      }
    } else if (state.senderRow === 24) {
      // stop_timer(r.ack);
      state.setSenderRow(25);
    } else if (state.senderRow === 25 && state.senderNetworkToDataLink.length > 0) {
      // from_network_layer(&buffer);
      setSenderBuffer4(state.senderNetworkToDataLink[0]);
      state.setSenderNetworkToDataLink(state.senderNetworkToDataLink.slice(1));
      state.setSenderRow(26);
    } else if (state.senderRow === 26) {
      // inc(next_frame_to_send);
      state.setSenderRow(27);
    } else if (state.senderRow === 27) {
      // }
      state.setSenderRow(28);
    } else if (state.senderRow === 28) {
      // }
      state.setSenderRow(29);
    } else if (state.senderRow === 29) {
      // s.info = buffer;
      setSenderS4(senderS4.withInfo(senderBuffer4));
      state.setSenderRow(30);
    } else if (state.senderRow === 30) {
      // s.seq = next_frame_to_send;
      setSenderS4(senderS4.withSeq(senderNextFrameToSend4));
      state.setSenderRow(31);
    } else if (state.senderRow === 31) {
      // s.ack = 1 - frame_expected;
      setSenderS4(senderS4.withAck(1 - senderFrameExpected4));
      state.setSenderRow(32);
    } else if (state.senderRow === 32) {
      // to_physical_layer(&s);
      state.setSenderDataLinkToPhysical(state.senderDataLinkToPhysical.concat([senderS4]));
      state.setSenderRow(33);
    } else if (state.senderRow === 33) {
      // }
      state.setSenderRow(15);
    }
  }, [senderNextFrameToSend4, senderFrameExpected4, senderR4, senderS4, senderBuffer4, senderEvent4]);

  const canStepSender4 = useCallback((state: ViewerState) => {
    if (state.senderRow === 9 && state.senderNetworkToDataLink.length === 0) {
      // from_network_layer(&buffer);
      return STALL_FROM_NETWORK_LAYER;
    } else if (state.senderRow === 16 && state.senderDataLinkEvent.length === 0) {
      // wait_for_event(&event);
      return STALL_WAIT_FOR_EVENT;
    } else if (state.senderRow === 18 && state.senderPhysicalToDataLink.length === 0) {
      // from_physical_layer(&r);
      return STALL_FROM_PHYSICAL_LAYER;
    } else if (state.senderRow === 25 && state.senderNetworkToDataLink.length === 0) {
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
    if (state.receiverRow === 7) {
      // next_frame_to_send = 0;
      setReceiverNextFrameToSend4(0);
      state.setReceiverRow(8);
    } else if (state.receiverRow === 8) {
      // frame_expected = 0;
      setReceiverFrameExpected4(0);
      state.setReceiverRow(9);
    } else if (state.receiverRow === 9 && state.receiverNetworkToDataLink.length > 0) {
      // from_network_layer(&buffer);
      setReceiverBuffer4(state.receiverNetworkToDataLink[0]);
      state.setReceiverNetworkToDataLink(state.receiverNetworkToDataLink.slice(1));
      state.setReceiverRow(10);
    } else if (state.receiverRow === 10) {
      // s.info = buffer;
      const s = receiverS4.clone();
      s.info = receiverBuffer4;
      setReceiverS4(s);
      state.setReceiverRow(11);
    } else if (state.receiverRow === 11) {
      // s.seq = next_frame_to_send;
      const s = receiverS4.clone();
      s.seq = receiverNextFrameToSend4;
      setReceiverS4(s);
      state.setReceiverRow(12);
    } else if (state.receiverRow === 12) {
      // s.ack = 1 - frame_expected;
      const s = receiverS4.clone();
      s.ack = 1 - receiverFrameExpected4;
      setReceiverS4(s);
      state.setReceiverRow(13);
    } else if (state.receiverRow === 13) {
      // to_physical_layer(&s);
      state.setReceiverDataLinkToPhysical(state.receiverDataLinkToPhysical.concat([receiverS4]));
      state.setReceiverRow(14);
    } else if (state.receiverRow === 14) {
      // start_timer(s.seq);
      state.setReceiverRow(15);
    } else if (state.receiverRow === 15) {
      // while (true) {
      state.setReceiverRow(16);
    } else if (state.receiverRow === 16 && state.receiverDataLinkEvent.length > 0) {
      // wait_for_event(&event);
      setReceiverEvent4(state.receiverDataLinkEvent[0]);
      state.setReceiverDataLinkEvent(state.receiverDataLinkEvent.slice(1));
      state.setReceiverRow(17);
    } else if (state.receiverRow === 17) {
      // if (event == frame_arrival) {
      if (receiverEvent4 === Event.FrameArrival) {
        state.setReceiverRow(18);
      } else {
        state.setReceiverRow(28);
      }
    } else if (state.receiverRow === 18 && state.receiverPhysicalToDataLink.length > 0) {
      // from_physical_layer(&r);
      setReceiverR4(state.receiverPhysicalToDataLink[0]);
      state.setReceiverPhysicalToDataLink(state.receiverPhysicalToDataLink.slice(1));
      state.setReceiverRow(19);
    } else if (state.receiverRow === 19) {
      // if (r.seq == frame_expected) {
      if (receiverR4.seq === receiverFrameExpected4) {
        state.setReceiverRow(20);
      } else {
        state.setReceiverRow(22);
      }
    } else if (state.receiverRow === 20) {
      // to_network_layer(&r.info);
      state.setReceiverDataLinkToNetwork(state.receiverDataLinkToNetwork.concat([receiverR4.info!]));
      state.setReceiverRow(21);
    } else if (state.receiverRow === 21) {
      // inc(frame_expected);
      setReceiverFrameExpected4(1 - receiverFrameExpected4);
      state.setReceiverRow(22);
    } else if (state.receiverRow === 22) {
      // }
      state.setReceiverRow(23);
    } else if (state.receiverRow === 23) {
      // if (r.ack == next_frame_to_send) {
      if (receiverR4.ack === receiverNextFrameToSend4) {
        state.setReceiverRow(24);
      } else {
        state.setReceiverRow(27);
      }
    } else if (state.receiverRow === 24) {
      // stop_timer(r.ack);
      state.setReceiverRow(25);
    } else if (state.receiverRow === 25 && state.receiverNetworkToDataLink.length > 0) {
      // from_network_layer(&buffer);
      setReceiverBuffer4(state.receiverNetworkToDataLink[0]);
      state.setReceiverNetworkToDataLink(state.receiverNetworkToDataLink.slice(1));
      state.setReceiverRow(26);
    } else if (state.receiverRow === 26) {
      // inc(next_frame_to_send);
      state.setReceiverRow(27);
    } else if (state.receiverRow === 27) {
      // }
      state.setReceiverRow(28);
    } else if (state.receiverRow === 28) {
      // }
      state.setReceiverRow(29);
    } else if (state.receiverRow === 29) {
      // s.info = buffer;
      setReceiverS4(receiverS4.withInfo(receiverBuffer4));
      state.setReceiverRow(30);
    } else if (state.receiverRow === 30) {
      // s.seq = next_frame_to_send;
      setReceiverS4(receiverS4.withSeq(receiverNextFrameToSend4));
      state.setReceiverRow(31);
    } else if (state.receiverRow === 31) {
      // s.ack = 1 - frame_expected;
      setReceiverS4(receiverS4.withAck(1 - receiverFrameExpected4));
      state.setReceiverRow(32);
    } else if (state.receiverRow === 32) {
      // to_physical_layer(&s);
      state.setReceiverDataLinkToPhysical(state.receiverDataLinkToPhysical.concat([receiverS4]));
      state.setReceiverRow(33);
    } else if (state.receiverRow === 33) {
      // }
      state.setReceiverRow(15);
    }
  }, [receiverNextFrameToSend4, receiverFrameExpected4, receiverR4, receiverS4, receiverBuffer4, receiverEvent4]);

  const canStepReceiver4 = useCallback((state: ViewerState) => {
    if (state.receiverRow === 9 && state.receiverNetworkToDataLink.length === 0) {
      // from_network_layer(&buffer);
      return STALL_FROM_NETWORK_LAYER;
    } else if (state.receiverRow === 16 && state.receiverDataLinkEvent.length === 0) {
      // wait_for_event(&event);
      return STALL_WAIT_FOR_EVENT;
    } else if (state.receiverRow === 18 && state.receiverPhysicalToDataLink.length === 0) {
      // from_physical_layer(&r);
      return STALL_FROM_PHYSICAL_LAYER;
    } else if (state.receiverRow === 25 && state.receiverNetworkToDataLink.length === 0) {
      // from_network_layer(&buffer);
      return STALL_FROM_NETWORK_LAYER;
    } else {
      return undefined;
    }
  }, []);

  return (
    <Container>
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
          initialSenderRow={4} senderCode={senderCode1}
          stepSender={stepSender1} canStepSender={canStepSender1}
          senderLocals={
            [`s: ${senderS1}`, `buffer: ${senderBuffer1}`]
          }
          initialReceiverRow={4} receiverCode={receiverCode1}
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
        ></Viewer>
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
          initialReceiverRow={4} receiverCode={receiverCode2}
          stepReceiver={stepReceiver2} canStepReceiver={canStepReceiver2}
          receiverLocals={
            [`r: ${receiverR2}`, `s: ${receiverS2}`, `event: ${receiverEvent2}`]
          }
          hideSenderDataLinkToNetwork={true}
          hideReceiverNetworkInput={true}
          hideReceiverNetworkToDataLink={true}
        ></Viewer>
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
          initialSenderRow={7} senderCode={senderCode3}
          stepSender={stepSender3} canStepSender={canStepSender3}
          senderLocals={
            [`next_frame_to_send: ${senderNextFrameToSend3}`, `s: ${senderS3}`, `buffer: ${senderBuffer3}`, `event: ${senderEvent3}`]
          }
          initialReceiverRow={6} receiverCode={receiverCode3}
          stepReceiver={stepReceiver3} canStepReceiver={canStepReceiver3}
          receiverLocals={
            [`frame_expected: ${receiverFrameExpected3}`, `r: ${receiverR3}`, `s: ${receiverS3}`, `event: ${receiverEvent3}`]
          }
          hideSenderDataLinkToNetwork={true}
          hideReceiverNetworkInput={true}
          hideReceiverNetworkToDataLink={true}
        ></Viewer>
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
          initialSenderRow={7} senderCode={senderCode4}
          stepSender={stepSender4} canStepSender={canStepSender4}
          senderLocals={
            [`next_frame_to_send: ${senderNextFrameToSend4}`, `frame_expected: ${senderFrameExpected4}`, `r: ${senderR4}`, `s: ${senderS4}`, `buffer: ${senderBuffer4}`, `event: ${senderEvent4}`]
          }
          initialReceiverRow={7} receiverCode={receiverCode4}
          stepReceiver={stepReceiver4} canStepReceiver={canStepReceiver4}
          receiverLocals={
            [`next_frame_to_send: ${receiverNextFrameToSend4}`, `frame_expected: ${receiverFrameExpected4}`, `r: ${receiverR4}`, `s: ${receiverS4}`, `buffer: ${receiverBuffer4}`, `event: ${receiverEvent4}`]
          }
        ></Viewer>
      </Grid>
    </Container>
  );
}

export default App;

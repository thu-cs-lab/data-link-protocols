import React, { useCallback, useState } from 'react';
import './App.css';
import { Box, Button, Container, Grid, List, ListItem, Paper, Stack, TextField, Typography } from '@mui/material';
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
    return new Frame(this.info?.clone());
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

  // sender physical layer
  senderDataLinkToPhysical: Frame[];
  setSenderDataLinkToPhysical: (val: Frame[]) => void;

  senderPhysicalToDataLink: Frame[];
  setSenderPhysicalToDataLink: (val: Frame[]) => void;

  // receiver physical layer
  receiverPhysicalToDataLink: Frame[];
  setReceiverPhysicalToDataLink: (val: Frame[]) => void;

  receiverDataLinkToPhysical: Frame[];
  setReceiverDataLinkToPhysical: (val: Frame[]) => void;

  // receiver data link layer
  receiverRow: number;
  setReceiverRow: (val: number) => void;

  receiverDataLinkEvent: Event[];
  setReceiverDataLinkEvent: (val: Event[]) => void;

  receiverDataLinkToNetwork: Packet[];
  setReceiverDataLinkToNetwork: (val: Packet[]) => void;
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
          return <ListItem key={entry.toString()}>
            {entry.toString()}
          </ListItem>;
        })
      }
    </List>
  </Box>;
}

type ViewerProps = {
  initialSenderRow: number;
  senderCode: string;
  stepSender: (state: ViewerState) => void;
  canStepSender: (state: ViewerState) => string | undefined;
  hideSenderPhysicalToDataLink?: boolean;
  hideSenderDataLinkEvent?: boolean;
  senderLocals: HasToString[];

  initialReceiverRow: number;
  receiverCode: string;
  stepReceiver: (state: ViewerState) => void;
  canStepReceiver: (state: ViewerState) => string | undefined;
  hideReceiverDataLinkToPhysical?: boolean;
  receiverLocals: HasToString[];
};

function Viewer(props: ViewerProps) {
  // sender network layer
  // user input for sender network
  const [senderNetworkInput, setSenderNetworkInput] = useState("");
  // sender network -> sender data link
  const [senderNetworkToDataLink, setSenderNetworkToDataLink] = useState<Packet[]>([]);
  const sendNetwork = useCallback(() => {
    const packet: Packet = new Packet(senderNetworkInput);
    setSenderNetworkToDataLink(senderNetworkToDataLink.concat(packet));
  }, [senderNetworkToDataLink, senderNetworkInput]);

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
  const [receiverDataLinkToPhysical, setReceiverDataLinkToPhysical] = useState<Frame[]>([]);

  // receiver network layer
  // receiver data link -> receiver network
  const [receiverDataLinkToNetwork, setReceiverDataLinkToNetwork] = useState<Packet[]>([]);

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

  const state: ViewerState = {
    senderRow: senderRow,
    setSenderRow: setSenderRow,

    receiverRow: receiverRow,
    setReceiverRow: setReceiverRow,

    senderNetworkToDataLink: senderNetworkToDataLink,
    setSenderNetworkToDataLink: setSenderNetworkToDataLink,

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
    setReceiverDataLinkToNetwork: setReceiverDataLinkToNetwork
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
          <Button variant="contained" onClick={sendNetwork}>发送</Button>
          <MyList description='以下是网络层发送给数据链路层，但数据链路层还没有接收的分组：'
            entries={senderNetworkToDataLink}></MyList>
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
    if (state.senderRow === 2) {
      // frame s;
      state.setSenderRow(3);
    } else if (state.senderRow === 3) {
      // packet buffer;
      state.setSenderRow(4);
    } else if (state.senderRow === 4) {
      // while (true) {
      state.setSenderRow(5);
    } else if (state.senderRow === 5 && state.senderNetworkToDataLink.length > 0) {
      // from_network_layer(&buffer);
      state.setSenderRow(6);
      setSenderBuffer1(state.senderNetworkToDataLink[0]);
      state.setSenderNetworkToDataLink(state.senderNetworkToDataLink.slice(1));
    } else if (state.senderRow === 6) {
      // s.info = buffer;
      const s = senderS1.clone();
      s.info = senderBuffer1;
      setSenderS1(s);
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
    if (state.receiverRow === 2) {
      // frame r;
      state.setReceiverRow(3);
    } else if (state.receiverRow === 3) {
      // event_type event;
      state.setReceiverRow(4);
    } else if (state.receiverRow === 4) {
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
    if (state.receiverRow === 5 && state.receiverDataLinkEvent.length == 0) {
      // wait_for_event(&event);
      return STALL_WAIT_FOR_EVENT;
    } else if (state.receiverRow === 6 && state.receiverPhysicalToDataLink.length == 0) {
      // from_physical_layer(&r);
      return STALL_FROM_PHYSICAL_LAYER;
    } else {
      return undefined;
    }
  }, []);

  const cantStepReceiverReason1 = useCallback((state: ViewerState) => {
    if (state.receiverRow === 5 && state.receiverDataLinkEvent.length == 0) {
      // wait_for_event(&event);
      return "没有新的事件";
    } else if (state.receiverRow === 6 && state.receiverPhysicalToDataLink.length == 0) {
      // from_physical_layer(&r);
      return "没有可以从物理层读取的帧";
    } else {
      return "";
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
    if (state.senderRow === 2) {
      // frame s;
      state.setSenderRow(3);
    } else if (state.senderRow === 3) {
      // packet buffer;
      state.setSenderRow(4);
    } else if (state.senderRow === 4) {
      // while (true) {
      state.setSenderRow(5);
    } else if (state.senderRow === 5 && state.senderNetworkToDataLink.length > 0) {
      // from_network_layer(&buffer);
      state.setSenderRow(6);
      setSenderBuffer2(state.senderNetworkToDataLink[0]);
      state.setSenderNetworkToDataLink(state.senderNetworkToDataLink.slice(1));
    } else if (state.senderRow === 6) {
      // s.info = buffer;
      state.setSenderRow(7);
      const s = senderS2.clone();
      s.info = senderBuffer2;
      setSenderS2(s);
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

  const cantStepSenderReason2 = useCallback((state: ViewerState) => {
    if (state.senderRow === 5 && state.senderNetworkToDataLink.length === 0) {
      // from_network_layer(&buffer);
      return "没有可以从网络层读取的分组";
    } else if (state.senderRow === 8 && state.senderDataLinkEvent.length === 0) {
      // wait_for_event(&event);
      return "没有新的事件";
    } else {
      return "";
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
    if (state.receiverRow === 2) {
      // frame r;
      state.setReceiverRow(3);
    } else if (state.receiverRow === 3) {
      // event_type event;
      state.setReceiverRow(4);
    } else if (state.receiverRow === 4) {
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
    if (state.receiverRow === 5 && state.receiverDataLinkEvent.length == 0) {
      // wait_for_event(&event);
      return STALL_WAIT_FOR_EVENT;
    } else if (state.receiverRow === 6 && state.receiverPhysicalToDataLink.length == 0) {
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
    if (state.senderRow === 2) {
      // seq_nr next_frame_to_send;
      state.setSenderRow(3);
    } else if (state.senderRow === 3) {
      // frame s;
      state.setSenderRow(4);
    } else if (state.senderRow === 4) {
      // packet buffer;
      state.setSenderRow(5);
    } else if (state.senderRow === 5) {
      // event_type event;
      state.setSenderRow(7);
    } else if (state.senderRow === 7) {
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
      const s = senderS3.clone();
      s.info = senderBuffer3;
      setSenderS3(s);
      state.setSenderRow(11);
    } else if (state.senderRow === 11) {
      // s.seq = next_frame_to_send;
      const s = senderS3.clone();
      s.seq = senderNextFrameToSend3;
      setSenderS3(s);
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
      if (senderEvent3 == Event.FrameArrival) {
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
    if (state.receiverRow === 2) {
      // seq_nr frame_expected;
      state.setReceiverRow(3);
    } else if (state.receiverRow === 3) {
      // frame r, s;
      state.setReceiverRow(4);
    } else if (state.receiverRow === 4) {
      // event_type event;
      state.setReceiverRow(6);
    } else if (state.receiverRow === 6) {
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
      const s = receiverS3.clone();
      s.ack = 1 - receiverFrameExpected3;
      setReceiverS3(s);
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
          initialSenderRow={2} senderCode={senderCode1}
          stepSender={stepSender1} canStepSender={canStepSender1}
          senderLocals={
            [`s: ${senderS1}`, `buffer: ${senderBuffer1}`]
          }
          initialReceiverRow={2} receiverCode={receiverCode1}
          stepReceiver={stepReceiver1} canStepReceiver={canStepReceiver1}
          receiverLocals={
            [`r: ${receiverR1}`, `event: ${receiverEvent1}`]
          }
          hideSenderDataLinkEvent={true}
          hideSenderPhysicalToDataLink={true}
          hideReceiverDataLinkToPhysical={true}
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
          initialSenderRow={2} senderCode={senderCode2}
          stepSender={stepSender2} canStepSender={canStepSender2}
          senderLocals={
            [`s: ${senderS2}`, `buffer: ${senderBuffer2}`, `event: ${senderEvent2}`]
          }
          initialReceiverRow={2} receiverCode={receiverCode2}
          stepReceiver={stepReceiver2} canStepReceiver={canStepReceiver2}
          receiverLocals={
            [`r: ${receiverR2}`, `s: ${receiverS2}`, `event: ${receiverEvent2}`]
          }
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
          initialSenderRow={2} senderCode={senderCode3}
          stepSender={stepSender3} canStepSender={canStepSender3}
          senderLocals={
            [`next_frame_to_send: ${senderNextFrameToSend3}`, `s: ${senderS3}`, `buffer: ${senderBuffer3}`, `event: ${senderEvent3}`]
          }
          initialReceiverRow={2} receiverCode={receiverCode3}
          stepReceiver={stepReceiver3} canStepReceiver={canStepReceiver3}
          receiverLocals={
            [`frame_expected: ${receiverFrameExpected3}`, `r: ${receiverR3}`, `s: ${receiverS3}`, `event: ${receiverEvent3}`]
          }
        ></Viewer>
      </Grid>
    </Container>
  );
}

export default App;

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

type Packet = {
  payload: string;
};

type Frame = {
  payload: string;
};

enum Event {
  FrameArrival = "Frame Arrival",
  CksumError = "Checksum Error",
  Timeout = "Timeout"
}

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

type ViewerProps = {
  initialSenderRow: number;
  senderCode: string;
  stepSender: (state: ViewerState) => void;
  canStepSender: (state: ViewerState) => boolean;
  cantStepSenderReason: (state: ViewerState) => string;
  hideSenderPhysicalToDataLink?: boolean;
  hideSenderDataLinkEvent?: boolean;
  senderLocals: string;

  initialReceiverRow: number;
  receiverCode: string;
  stepReceiver: (state: ViewerState) => void;
  canStepReceiver: (state: ViewerState) => boolean;
  cantStepReceiverReason: (state: ViewerState) => string;
  hideReceiverDataLinkToPhysical?: boolean;
  receiverLocals: string;
};

function Viewer(props: ViewerProps) {
  // sender network layer
  // user input for sender network
  const [senderNetworkInput, setSenderNetworkInput] = useState("");
  // sender network -> sender data link
  const [senderNetworkToDataLink, setSenderNetworkToDataLink] = useState<Packet[]>([]);
  const sendNetwork = useCallback(() => {
    const packet: Packet = {
      payload: senderNetworkInput
    };
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
    padding: '30px',
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
          <Typography>
            以下是网络层发送给数据链路层，但数据链路层还没有接收的分组：
          </Typography>
          <List>
            {
              senderNetworkToDataLink.map((entry) => {
                return <ListItem key={entry.payload}>
                  Packet: payload={entry.payload}
                </ListItem>;
              })
            }
          </List>
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
          <Button variant="contained" onClick={() => props.stepSender(state)} disabled={!props.canStepSender(state)}>下一步</Button>
          <Typography>
            {props.cantStepSenderReason(state)}
          </Typography>
          <Typography>
            局部变量：
            {props.senderLocals}
          </Typography>
          {
            props.hideSenderDataLinkEvent ? null : <Box><Typography>
              以下是数据链路层尚未处理的事件：
            </Typography>
              <List>
                {
                  senderDataLinkEvent.map((entry) => {
                    return <ListItem key={entry}>
                      {entry}
                    </ListItem>;
                  })
                }
              </List>
            </Box>
          }
        </Paper>
        <Paper sx={style2}>
          <Typography variant="h5">
            物理层
          </Typography>
          {
            props.hideSenderPhysicalToDataLink ? null : <Box>
              <Typography>
                以下是物理层发送给数据链路层，但是数据链路层还没有接收的帧：
              </Typography>
              <List>
                {
                  senderPhysicalToDataLink.map((entry) => {
                    return <ListItem key={entry.payload}>
                      Frame: payload={entry.payload}
                    </ListItem>;
                  })
                }
              </List>
            </Box>
          }
          <Typography>
            以下是数据链路层发送给物理层，但是物理层还没有发送的帧：
          </Typography>
          <List>
            {
              senderDataLinkToPhysical.map((entry) => {
                return <ListItem key={entry.payload}>
                  Frame: payload={entry.payload}
                </ListItem>;
              })
            }
          </List>
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
          <Typography>
            以下是数据链路层发送给网络层的分组：
          </Typography>
          <List>
            {
              receiverDataLinkToNetwork.map((entry) => {
                return <ListItem key={entry.payload}>
                  Packet: payload={entry.payload}
                </ListItem>;
              })
            }
          </List>
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
          <Button variant="contained" onClick={() => props.stepReceiver(state)} disabled={!props.canStepReceiver(state)}>下一步</Button>
          <Typography>
            {props.cantStepReceiverReason(state)}
          </Typography>
          <Typography>
            局部变量：
            {props.receiverLocals}
          </Typography>
          <Typography>
            以下是数据链路层尚未处理的事件：
          </Typography>
          <List>
            {
              receiverDataLinkEvent.map((entry) => {
                return <ListItem key={entry}>
                  {entry}
                </ListItem>;
              })
            }
          </List>
        </Paper>
        <Paper sx={style2}>
          <Typography variant="h5">
            物理层
          </Typography>
          <Typography>
            以下是物理层发送给数据链路层，但是数据链路层还没有接收的帧：
          </Typography>
          <List>
            {
              receiverPhysicalToDataLink.map((entry) => {
                return <ListItem key={entry.payload}>
                  Frame: payload={entry.payload}
                </ListItem>;
              })
            }
          </List>
          {
            props.hideReceiverDataLinkToPhysical ? null : <Box>
              <Typography>
                以下是数据链路层发送给物理层，但是物理层还没有发送的帧：
              </Typography>
              <List>
                {
                  receiverDataLinkToPhysical.map((entry) => {
                    return <ListItem key={entry.payload}>
                      Frame: payload={entry.payload}
                    </ListItem>;
                  })
                }
              </List>
            </Box>
          }
          <Button variant="contained" onClick={sendReceiverPhysical} disabled={receiverDataLinkToPhysical.length === 0}>发送</Button>
        </Paper>
      </Paper>
    </Grid>
  </Grid>
}

function App() {
  // frame s;
  const [senderS1, setSenderS1] = useState<Packet>({ payload: "" });
  // packet buffer;
  const [senderBuffer1, setSenderBuffer1] = useState<Frame>({ payload: "" });
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
      setSenderS1({
        payload: senderBuffer1.payload
      });
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
      return false;
    } else {
      return true;
    }
  }, []);

  const cantStepSenderReason1 = useCallback((state: ViewerState) => {
    if (state.senderRow === 5 && state.senderNetworkToDataLink.length === 0) {
      // from_network_layer(&buffer);
      return "没有可以从网络层读取的分组";
    } else {
      return "";
    }
  }, []);

  const [receiverR1, setReceiverR1] = useState<Frame>({ payload: "" });
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
      state.setReceiverDataLinkToNetwork(state.receiverDataLinkToNetwork.concat([receiverR1]))
    } else if (state.receiverRow === 8) {
      // }
      state.setReceiverRow(4);
    }
  }, [receiverR1]);

  const canStepReceiver1 = useCallback((state: ViewerState) => {
    if (state.receiverRow === 5 && state.receiverDataLinkEvent.length == 0) {
      // wait_for_event(&event);
      return false;
    } else if (state.receiverRow === 6 && state.receiverPhysicalToDataLink.length == 0) {
      // from_physical_layer(&r);
      return false;
    } else {
      return true;
    }
  }, []);

  const cantStepReceiverReason1 = useCallback((state: ViewerState) => {
    if (state.receiverRow === 5 && state.receiverDataLinkEvent.length == 0) {
      // wait_for_event(&event);
      return "没有新的事件";
    } else if (state.receiverRow === 6 && state.receiverPhysicalToDataLink.length == 0) {
      // from_physical_layer(&r);
      return "物理层没有新的帧";
    } else {
      return "";
    }
  }, []);

  const [senderS2, setSenderS2] = useState<Frame>({ payload: "" });
  const [senderBuffer2, setSenderBuffer2] = useState<Packet>({ payload: "" });
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
      state.setSenderNetworkToDataLink(state.senderNetworkToDataLink.slice(2));
    } else if (state.senderRow === 6) {
      // s.info = buffer;
      state.setSenderRow(7);
      setSenderS2(senderBuffer2);
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
      return false;
    } else if (state.senderRow === 8 && state.senderDataLinkEvent.length === 0) {
      // wait_for_event(&event);
      return false;
    } else {
      return true;
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

  const [receiverR2, setReceiverR2] = useState<Frame>({ payload: "" });
  const [receiverS2, setReceiverS2] = useState<Frame>({ payload: "" });
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
      state.setReceiverRow(6);
      setReceiverEvent2(state.receiverDataLinkEvent[0]);
      state.setReceiverDataLinkEvent(state.receiverDataLinkEvent.slice(1));
    } else if (state.receiverRow === 6 && state.receiverPhysicalToDataLink.length > 0) {
      // from_physical_layer(&r);
      state.setReceiverRow(7);
      setReceiverR2(state.receiverPhysicalToDataLink[0]);
      state.setReceiverPhysicalToDataLink(state.receiverPhysicalToDataLink.slice(1));
    } else if (state.receiverRow === 7) {
      // to_network_layer(&r.info);
      state.setReceiverRow(8);
      state.setReceiverDataLinkToNetwork(state.receiverDataLinkToNetwork.concat([receiverR2]));
    } else if (state.receiverRow === 8) {
      // to_physical_layer(&s);
      state.setReceiverRow(9);
      state.setReceiverDataLinkToPhysical(state.receiverDataLinkToPhysical.concat([receiverS2]));
    } else if (state.receiverRow === 9) {
      // }
      state.setReceiverRow(4);
    }
  }, [receiverR2, receiverS2]);

  const canStepReceiver2 = useCallback((state: ViewerState) => {
    if (state.receiverRow === 5 && state.receiverDataLinkEvent.length == 0) {
      // wait_for_event(&event);
      return false;
    } else if (state.receiverRow === 6 && state.receiverPhysicalToDataLink.length == 0) {
      // from_physical_layer(&r);
      return false;
    } else {
      return true;
    }
  }, []);

  const cantStepReceiverReason2 = useCallback((state: ViewerState) => {
    if (state.receiverRow === 5 && state.receiverDataLinkEvent.length == 0) {
      // wait_for_event(&event);
      return "没有新的事件";
    } else if (state.receiverRow === 6 && state.receiverPhysicalToDataLink.length == 0) {
      // from_physical_layer(&r);
      return "物理层没有新的帧";
    } else {
      return "";
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
              协议一：乌托邦协议（Utopia）
            </Typography>
            <Typography>
              协议一提供了从发送方到接收方的单向数据传输。协议一假设了传输通道是无差错的，并且接收方可以任意快地处理输入数据。因此，发送方只需要循环发送数据，多快都可以。
            </Typography>
          </Paper>
        </Grid>
        <Viewer
          initialSenderRow={2} senderCode={senderCode1}
          stepSender={stepSender1} canStepSender={canStepSender1} cantStepSenderReason={cantStepSenderReason1}
          senderLocals={
            `s: Frame: payload=${senderS1.payload}, buffer: Packet: payload=${senderBuffer1.payload}`
          }
          initialReceiverRow={2} receiverCode={receiverCode1}
          stepReceiver={stepReceiver1} canStepReceiver={canStepReceiver1} cantStepReceiverReason={cantStepReceiverReason1}
          receiverLocals={
            `r: Frame: payload=${receiverR1.payload}, event: Event=${receiverEvent1}`
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
              协议二：停止-等待协议（Stop-and-Wait）
            </Typography>
            <Typography>
              协议二（停止-等待，简称停等协议）也提供了从发送端到接收端的单向数据流。 与协议一一样，依然假设通信信道无差错。但是，这次接收端只有有限的缓冲区容量和有限的处理速度，因此协议必须明确防止发送端以快于接收端能处理的速度，向接收端发送数据。
            </Typography>
          </Paper>
        </Grid>
        <Viewer
          initialSenderRow={2} senderCode={senderCode2}
          stepSender={stepSender2} canStepSender={canStepSender2} cantStepSenderReason={cantStepSenderReason2}
          senderLocals={
            `s: Frame: payload=${senderS2.payload}, buffer: Packet: payload=${senderBuffer2.payload}`
          }
          initialReceiverRow={2} receiverCode={receiverCode2}
          stepReceiver={stepReceiver2} canStepReceiver={canStepReceiver2} cantStepReceiverReason={cantStepReceiverReason2}
          receiverLocals={
            `r: Frame: payload=${receiverR2.payload}, s: Frame: payload=${receiverS2.payload}, event: Event=${receiverEvent2}`
          }
        ></Viewer>
      </Grid>
    </Container>
  );
}

export default App;

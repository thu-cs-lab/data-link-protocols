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

type ViewerState = {
  senderRow: number;
  setSenderRow: (val: number) => void;

  receiverRow: number;
  setReceiverRow: (val: number) => void;

  senderNetworkToDataLink: string[];
  setSenderNetworkToDataLink: (val: string[]) => void;

  senderDataLinkToPhysical: string[];
  setSenderDataLinkToPhysical: (val: string[]) => void;
};

type ViewerProps = {
  initialSenderRow: number;
  senderCode: string;
  stepSender: (state: ViewerState) => void;
  canStepSender: (state: ViewerState) => boolean;
  cantStepSenderReason: (state: ViewerState) => string;

  initialReceiverRow: number;
  receiverCode: string;
  stepReceiver: (state: ViewerState) => void;
  canStepReceiver: (state: ViewerState) => boolean;
  cantStepReceiverReason: (state: ViewerState) => string;
};

function Viewer(props: ViewerProps) {
  // sender network layer
  // user input for sender network
  const [senderNetworkInput, setSenderNetworkInput] = useState("");
  // sender network -> sender data link
  const [senderNetworkToDataLink, setSenderNetworkToDataLink] = useState<string[]>([]);
  const sendNetwork = useCallback(() => {
    setSenderNetworkToDataLink(senderNetworkToDataLink.concat(senderNetworkInput));
  }, [senderNetworkToDataLink, senderNetworkInput]);

  // sender data link layer
  const [senderRow, setSenderRow] = useState(props.initialSenderRow);
  const senderCode = AddRowMarker(props.senderCode, senderRow);
  // sender data link -> sender physical
  const [senderDataLinkToPhysical, setSenderDataLinkToPhysical] = useState<string[]>([]);

  // sender physical layer
  // sender physical -> receiver physical
  const [senderToReceiver, setSenderToReceiver] = useState<string[]>([]);
  const sendPhysical = useCallback(() => {
    setSenderToReceiver(senderToReceiver.concat(senderDataLinkToPhysical[0]));
    setSenderDataLinkToPhysical(senderDataLinkToPhysical.slice());
  }, [senderToReceiver, senderDataLinkToPhysical]);

  // receiver data link layer
  const [receiverRow, setReceiverRow] = useState(props.initialReceiverRow);
  const receiverCode = AddRowMarker(props.receiverCode, receiverRow);

  const state: ViewerState = {
    senderRow: senderRow,
    setSenderRow: setSenderRow,

    receiverRow: receiverRow,
    setReceiverRow: setReceiverRow,

    senderNetworkToDataLink: senderNetworkToDataLink,
    setSenderNetworkToDataLink: setSenderNetworkToDataLink,

    senderDataLinkToPhysical: senderDataLinkToPhysical,
    setSenderDataLinkToPhysical: setSenderDataLinkToPhysical
  };

  return <Grid container spacing={2}>
    <Grid item xs={6}>
      <Paper sx={{
        padding: '20px',
      }}>
        <Typography variant="h4">
          发送方
        </Typography>
        <Paper sx={{
          padding: '10px',
          marginTop: '10px'
        }}>
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
                return <ListItem key={entry}>
                  {entry}
                </ListItem>;
              })
            }
          </List>
        </Paper>
        <Paper sx={{
          padding: '10px',
          marginTop: '10px'
        }}>
          <Typography variant="h5">
            数据链路层
          </Typography>
          <Typography>
            协议一的发送方代码：
          </Typography>
          <SyntaxHighlighter language="javascript" style={style}>
            {senderCode}
          </SyntaxHighlighter>
          <Button variant="contained" onClick={() => props.stepSender(state)} disabled={!props.canStepSender(state)}>下一步</Button>
          <Typography>
            {props.cantStepSenderReason(state)}
          </Typography>
        </Paper>
        <Paper sx={{
          padding: '10px',
          marginTop: '10px'
        }}>
          <Typography variant="h5">
            物理层
          </Typography>
          <Typography>
            以下是数据链路层发送给物理层，但是物理层还没有发送出去的分组：
          </Typography>
          <List>
            {
              senderDataLinkToPhysical.map((entry) => {
                return <ListItem key={entry}>
                  {entry}
                </ListItem>;
              })
            }
          </List>
          <Button variant="contained" onClick={sendPhysical} disabled={senderDataLinkToPhysical.length === 0}>发送</Button>
        </Paper>
      </Paper>
    </Grid>
    <Grid item xs={4}>
      <Typography variant="h2">
        接收方
      </Typography>
      <Box>
        <Typography variant="h3">
          网络层
        </Typography>
      </Box>
      <Box>
        <Typography variant="h3">
          数据链路层
        </Typography>
        <Typography>
          协议一的接收方代码：
        </Typography>
        <SyntaxHighlighter language="javascript" style={style}>
          {receiverCode}
        </SyntaxHighlighter>
        <Button variant="contained" onClick={() => props.stepReceiver(state)} disabled={!props.canStepReceiver(state)}>下一步</Button>
        <Typography>
          {props.cantStepReceiverReason(state)}
        </Typography>
      </Box>
      <Box>
        <Typography variant="h3">
          物理层
        </Typography>
      </Box>
    </Grid>

  </Grid>
}

function App() {
  const [senderCurrentFrame1, setSenderCurrentFrame1] = useState("");
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
  }
  `;

  const stepSender1 = useCallback((state: ViewerState) => {
    if (state.senderRow === 2) {
      state.setSenderRow(3);
    } else if (state.senderRow === 3) {
      state.setSenderRow(4);
    } else if (state.senderRow === 4) {
      state.setSenderRow(5);
    } else if (state.senderRow === 5 && state.senderNetworkToDataLink.length > 0) {
      state.setSenderRow(6);
      setSenderCurrentFrame1(state.senderNetworkToDataLink[0]);
      state.setSenderNetworkToDataLink(state.senderNetworkToDataLink.slice(1));
    } else if (state.senderRow === 6) {
      state.setSenderRow(7);
    } else if (state.senderRow === 7) {
      state.setSenderRow(8);
      state.setSenderDataLinkToPhysical(state.senderDataLinkToPhysical.concat(senderCurrentFrame1));
    } else if (state.senderRow === 8) {
      state.setSenderRow(4);
    }
  }, [senderCurrentFrame1]);

  const canStepSender1 = useCallback((state: ViewerState) => {
    if (state.senderRow === 5 && state.senderNetworkToDataLink.length === 0) {
      return false;
    } else {
      return true;
    }
  }, []);

  const cantStepSenderReason1 = useCallback((state: ViewerState) => {
    if (state.senderRow === 5 && state.senderNetworkToDataLink.length === 0) {
      return "没有可以从网络层读取的分组";
    } else {
      return "";
    }
  }, []);

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
  }
  `;

  const stepReceiver1 = useCallback((state: ViewerState) => {
    if (state.receiverRow === 2) {
      state.setReceiverRow(3);
    } else if (state.receiverRow === 3) {
      state.setReceiverRow(4);
    } else if (state.receiverRow === 4) {
      state.setReceiverRow(5);
    } else if (state.receiverRow === 5) {
      state.setReceiverRow(6);
    } else if (state.receiverRow === 6) {
      state.setReceiverRow(7);
    } else if (state.receiverRow === 7) {
      state.setReceiverRow(8);
    } else if (state.receiverRow === 8) {
      state.setReceiverRow(4);
    }
  }, []);

  const canStepReceiver1 = useCallback((state: ViewerState) => {
    if (state.receiverRow === 5) {
      return false;
    } else {
      return true;
    }
  }, []);

  const cantStepReceiverReason1 = useCallback(() => {
    return "";
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
          initialReceiverRow={2} receiverCode={receiverCode1}
          stepReceiver={stepReceiver1} canStepReceiver={canStepReceiver1} cantStepReceiverReason={cantStepReceiverReason1}
        ></Viewer>
      </Grid>
    </Container>
  );
}

export default App;

import React, { useCallback, useState } from 'react';
import './App.css';
import { Button, Typography } from '@mui/material';
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

function App() {
  const [senderToReceiver1, setSenderToReceiver1] = useState<number[]>([]);

  const [sender1Row, setSender1Row] = useState(2);
  const sender1 = AddRowMarker(`
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
  `, sender1Row);

  const stepSender1 = useCallback(() => {
    if (sender1Row === 2) {
      setSender1Row(3);
    } else if (sender1Row === 3) {
      setSender1Row(4);
    } else if (sender1Row === 4) {
      setSender1Row(5);
    } else if (sender1Row === 5) {
      setSender1Row(6);
    } else if (sender1Row === 6) {
      setSender1Row(7);
    } else if (sender1Row === 7) {
      setSender1Row(8);
      setSenderToReceiver1(senderToReceiver1.concat([1]));
    } else if (sender1Row === 8) {
      setSender1Row(4);
    }
  }, [sender1Row, senderToReceiver1]);

  const canStepSender1 = useCallback(() => {
    return true;
  }, []);

  const [receiver1Row, setReceiver1Row] = useState(2);
  const receiver1 = AddRowMarker(`
  void receiver1(void)
  {
    frame r;
    event_type event;                        /* filled in by wait, but not used here */
    while (true) {
      wait_for_event(&event);                /* only possibility is frame_arrival */
      from_physical_layer(&r);               /* go get the inbound frame */
      to_physical_layer(&r.info);            /* pass the data to the network layer */
    }
  }
  `, receiver1Row);

  const stepReceiver1 = useCallback(() => {
    if (receiver1Row === 2) {
      setReceiver1Row(3);
    } else if (receiver1Row === 3) {
      setReceiver1Row(4);
    } else if (receiver1Row === 4) {
      setReceiver1Row(5);
    } else if (receiver1Row === 5 && senderToReceiver1.length > 0) {
      setReceiver1Row(6);
      setSenderToReceiver1(senderToReceiver1.slice(1));
    } else if (receiver1Row === 6) {
      setReceiver1Row(7);
    } else if (receiver1Row === 7) {
      setReceiver1Row(8);
    } else if (receiver1Row === 8) {
      setReceiver1Row(4);
    }
  }, [receiver1Row, senderToReceiver1]);

  const canStepReceiver1 = useCallback(() => {
    if (receiver1Row === 5 && senderToReceiver1.length === 0) {
      return false;
    } else {
      return true;
    }
  }, [receiver1Row, senderToReceiver1]);

  return (
    <div className="App">
      <Typography variant="h1">
        数据链路层协议
      </Typography>
      <Typography>
        在学习《计算机网络原理》课程时，数据链路层协议是一个重难点。为了理解《计算机网络》教材上讲述的数据链路层协议，你可以在本页面中观察各个数据链路层协议的工作方式。
      </Typography>
      <Typography variant="h2">
        协议一：乌托邦协议（Utopia）
      </Typography>
      <Typography>
        协议一提供了从发送方到接收方的单向数据传输。协议一假设了传输通道是无差错的，并且接收方可以任意快地处理输入数据。因此，发送方只需要循环发送数据，多快都可以。
      </Typography>
      <Typography>
        协议一的发送方代码：
      </Typography>
      <SyntaxHighlighter language="javascript" style={style}>
        {sender1}
      </SyntaxHighlighter>
      <Button variant="contained" onClick={stepSender1} disabled={!canStepSender1()}>下一步</Button>
      {senderToReceiver1}
      <Typography>
        协议一的接收方代码：
      </Typography>
      <SyntaxHighlighter language="javascript" style={style}>
        {receiver1}
      </SyntaxHighlighter>
      <Button variant="contained" onClick={stepReceiver1} disabled={!canStepReceiver1()}>下一步</Button>
    </div>
  );
}

export default App;

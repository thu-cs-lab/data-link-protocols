import React, { useCallback, useState } from 'react';
import { Box, Button, Grid, Paper, TextField, Typography } from '@mui/material';
import { tomorrow as style } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { Event, Packet, Frame, HasToString, AddRowMarker, FastForwarder, EventType } from './Common';
import { MyList } from './MyList';

export type ViewerState = {
  // sender network layer
  senderNetworkToDataLink: Packet[];
  setSenderNetworkToDataLink: (val: Packet[]) => void;

  senderEnableNetworkLayer: () => void;
  senderDisableNetworkLayer: () => void;

  // sender data link layer
  senderRow: number;
  setSenderRow: (val: number) => void;

  senderDataLinkEvent: EventType[];
  setSenderDataLinkEvent: (val: EventType[]) => void;

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

  receiverDataLinkEvent: EventType[];
  setReceiverDataLinkEvent: (val: EventType[]) => void;

  receiverDataLinkToNetwork: Packet[];
  setReceiverDataLinkToNetwork: (val: Packet[]) => void;

  // receiver network layer
  receiverNetworkToDataLink: Packet[];
  setReceiverNetworkToDataLink: (val: Packet[]) => void;

  receiverEnableNetworkLayer: () => void;
  receiverDisableNetworkLayer: () => void;
};

export type ViewerProps = {
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
  hideAddEventButton?: boolean;
  hideAddAckTimeoutEventButton?: boolean;
  addOldestFrameToTimeoutEvent?: boolean;
};

export function Viewer(props: ViewerProps) {
  // sender network layer
  // sender network -> sender data link
  const [senderNetworkToDataLink, setSenderNetworkToDataLink] = useState<Packet[]>([]);
  const [senderNetworkEnabled, setSenderNetworkEnabled] = useState<boolean>(false);
  // user input for sender network
  const [senderNetworkInput, setSenderNetworkInput] = useState("");
  // sender data link -> sender network
  const [senderDataLinkToNetwork, setSenderDataLinkToNetwork] = useState<Packet[]>([]);

  // sender data link layer
  const [senderRow, setSenderRow] = useState(props.initialSenderRow);
  const senderCode = AddRowMarker(props.senderCode, senderRow);
  const [senderDataLinkEvent, setSenderDataLinkEvent] = useState<EventType[]>([]);
  // sender data link -> sender physical
  const [senderDataLinkToPhysical, setSenderDataLinkToPhysical] = useState<Frame[]>([]);
  // sender physical -> sender data link
  const [senderPhysicalToDataLink, setSenderPhysicalToDataLink] = useState<Frame[]>([]);
  // user input for timer index
  const [senderTimerIndex, setSenderTimerIndex] = useState<string>("");
  const addSenderEvent = useCallback((event: EventType) => {
    setSenderDataLinkEvent(senderDataLinkEvent.concat([event]));
  }, [senderDataLinkEvent]);
  const senderSendNetwork = useCallback(() => {
    const packet: Packet = new Packet(senderNetworkInput);
    setSenderNetworkToDataLink(senderNetworkToDataLink.concat(packet));
    if (senderNetworkEnabled) {
      setSenderDataLinkEvent(senderDataLinkEvent.concat([Event.NetworkLayerReady]));
    }
  }, [senderNetworkToDataLink, senderDataLinkEvent, senderNetworkInput, senderNetworkEnabled]);
  const senderEnableNetworkLayer = useCallback(() => {
    if (!senderNetworkEnabled) {
      let events = [];
      for (let _ in senderNetworkToDataLink) {
        events.push(Event.NetworkLayerReady);
      }
      setSenderDataLinkEvent(senderDataLinkEvent.concat(events));
      setSenderNetworkEnabled(true);
    }
  }, [senderDataLinkEvent, senderNetworkToDataLink, senderNetworkEnabled]);
  const senderDisableNetworkLayer = useCallback(() => {
    if (senderNetworkEnabled) {
      let events: EventType[] = [];
      for (let event of senderDataLinkEvent) {
        if (event !== Event.NetworkLayerReady) {
          events.push(event);
        }
      }
      setSenderDataLinkEvent(events);
      setSenderNetworkEnabled(false);
    }
  }, [senderDataLinkEvent, senderNetworkEnabled]);

  // sender & receiver physical layer
  // sender physical -> receiver physical is implicit
  // receiver physical -> receiver data link
  const [receiverPhysicalToDataLink, setReceiverPhysicalToDataLink] = useState<Frame[]>([]);

  // receiver data link layer
  const [receiverRow, setReceiverRow] = useState(props.initialReceiverRow);
  const receiverCode = AddRowMarker(props.receiverCode, receiverRow);
  const [receiverDataLinkEvent, setReceiverDataLinkEvent] = useState<EventType[]>([]);
  // receiver data link -> receiver physical
  const [receiverDataLinkToPhysical, setReceiverDataLinkToPhysical] = useState<Frame[]>([]);
  // receiver data link -> receiver network
  const [receiverDataLinkToNetwork, setReceiverDataLinkToNetwork] = useState<Packet[]>([]);
  // user input for timer index
  const [receiverTimerIndex, setReceiverTimerIndex] = useState<string>("");
  const addReceiverEvent = useCallback((event: EventType) => {
    setReceiverDataLinkEvent(receiverDataLinkEvent.concat([event]));
  }, [receiverDataLinkEvent]);

  // receiver network layer
  // receiver network -> receiver data link
  const [receiverNetworkToDataLink, setReceiverNetworkToDataLink] = useState<Packet[]>([]);
  const [receiverNetworkEnabled, setReceiverNetworkEnabled] = useState<boolean>(false);
  // user input for receiver network
  const [receiverNetworkInput, setReceiverNetworkInput] = useState("");
  const receiverSendNetwork = useCallback(() => {
    const packet: Packet = new Packet(receiverNetworkInput);
    setReceiverNetworkToDataLink(receiverNetworkToDataLink.concat(packet));
    if (receiverNetworkEnabled) {
      setReceiverDataLinkEvent(receiverDataLinkEvent.concat([Event.NetworkLayerReady]));
    }
  }, [receiverNetworkToDataLink, receiverDataLinkEvent, receiverNetworkInput, receiverNetworkEnabled]);
  const receiverEnableNetworkLayer = useCallback(() => {
    if (!receiverNetworkEnabled) {
      let events = [];
      for (let _ in receiverNetworkToDataLink) {
        events.push(Event.NetworkLayerReady);
      }
      setReceiverDataLinkEvent(receiverDataLinkEvent.concat(events));
      setReceiverNetworkEnabled(true);
    }
  }, [receiverDataLinkEvent, receiverNetworkToDataLink, receiverNetworkEnabled]);
  const receiverDisableNetworkLayer = useCallback(() => {
    if (receiverNetworkEnabled) {
      let events: EventType[] = [];
      for (let event of receiverDataLinkEvent) {
        if (event !== Event.NetworkLayerReady) {
          events.push(event);
        }
      }
      setReceiverDataLinkEvent(events);
      setReceiverNetworkEnabled(false);
    }
  }, [receiverDataLinkEvent, receiverNetworkEnabled]);

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

    senderEnableNetworkLayer: senderEnableNetworkLayer,
    senderDisableNetworkLayer: senderDisableNetworkLayer,

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
    setReceiverNetworkToDataLink: setReceiverNetworkToDataLink,

    receiverEnableNetworkLayer: receiverEnableNetworkLayer,
    receiverDisableNetworkLayer: receiverDisableNetworkLayer,
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
          <p></p>
          <TextField label="载荷" variant="outlined" fullWidth onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setSenderNetworkInput(event.target.value);
          }} />
          <p></p>
          <Button variant="contained" onClick={senderSendNetwork}>发送</Button>
          <p></p>
          <MyList description='以下是网络层发送给数据链路层，但数据链路层还没有接收的分组：'
            entries={senderNetworkToDataLink}></MyList>
          <p></p>
          <MyList description='以下是数据链路层发送给网络层的分组：'
            hide={props.hideSenderDataLinkToNetwork}
            entries={senderDataLinkToNetwork}></MyList>
        </Paper>
        <Paper sx={style2}>
          <Typography variant="h5">
            数据链路层
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={8}>
              <Typography>
                发送方代码：
              </Typography>
              <SyntaxHighlighter language="javascript" style={style} customStyle={{
                maxHeight: '700px'
              }}>
                {senderCode}
              </SyntaxHighlighter>
            </Grid>
            <Grid item xs={4}>
              <Button variant="contained" onClick={() => props.stepSender(state)} disabled={props.canStepSender(state) !== undefined}>下一步</Button>
              <p></p>
              <Button variant="contained" onClick={fastForwardSender} disabled={props.canStepSender(state) !== undefined}>下一步直到无法立即继续</Button>
              <p></p>
              <Typography>
                {props.canStepSender(state)}
              </Typography>
              <p></p>
              <MyList description='局部变量：'
                entries={props.senderLocals}></MyList>
              <MyList description='以下是数据链路层尚未处理的事件：'
                hide={props.hideSenderDataLinkEvent}
                entries={senderDataLinkEvent}></MyList>
              {
                props.hideAddEventButton ? null : <Box>
                  <Button variant="contained" onClick={() => addSenderEvent(Event.CksumError)}>添加 Checksum Error 事件</Button>
                  <p></p>
                  {
                    props.addOldestFrameToTimeoutEvent ?
                      <Box>
                        <TextField label="超时 Timer 编号" variant="outlined" fullWidth onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                          setSenderTimerIndex(event.target.value);
                        }} error={Number.isNaN(parseInt(senderTimerIndex))} helperText="请输入整数" />
                        <Button variant="contained" disabled={Number.isNaN(parseInt(senderTimerIndex))} onClick={() => addSenderEvent([Event.Timeout, parseInt(senderTimerIndex)])}>添加 Timeout 事件</Button>
                      </Box> :
                      <Button variant="contained" onClick={() => addSenderEvent(Event.Timeout)}>添加 Timeout 事件</Button>
                  }
                  <p></p>
                  {
                    props.hideAddAckTimeoutEventButton ? null :
                      <Button variant="contained" onClick={() => addSenderEvent(Event.AckTimeout)}>添加 Ack Timeout 事件</Button>
                  }
                </Box>
              }
            </Grid>
          </Grid>
        </Paper>
        <Paper sx={style2}>
          <Typography variant="h5">
            物理层
          </Typography>
          <MyList description='以下是物理层发送给数据链路层，但是数据链路层还没有接收的帧：'
            hide={props.hideSenderPhysicalToDataLink}
            entries={senderPhysicalToDataLink}></MyList>
          <p></p>
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
              <p></p>
              <TextField label="载荷" variant="outlined" fullWidth onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setReceiverNetworkInput(event.target.value);
              }} />
              <p></p>
              <Button variant="contained" onClick={receiverSendNetwork}>发送</Button>
            </Box>
          }
          <p></p>
          <MyList description='以下是网络层发送给数据链路层，但数据链路层还没有接收的分组：'
            hide={props.hideReceiverNetworkToDataLink}
            entries={receiverNetworkToDataLink}></MyList>
          <p></p>
          <MyList description='以下是数据链路层发送给网络层的分组：'
            entries={receiverDataLinkToNetwork}></MyList>
        </Paper>
        <Paper sx={style2}>
          <Typography variant="h5">
            数据链路层
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={8}>
              <Typography>
                接收方代码：
              </Typography>
              <SyntaxHighlighter language="javascript" style={style} customStyle={{
                maxHeight: '700px'
              }}>
                {receiverCode}
              </SyntaxHighlighter>
            </Grid>
            <Grid item xs={4}>
              <Button variant="contained" onClick={() => props.stepReceiver(state)} disabled={props.canStepReceiver(state) !== undefined}>下一步</Button>
              <p></p>
              <Button variant="contained" onClick={fastForwardReceiver} disabled={props.canStepReceiver(state) !== undefined}>下一步直到无法立即继续</Button>
              <p></p>
              <Typography>
                {props.canStepReceiver(state)}
              </Typography>
              <p></p>
              <MyList description='局部变量：'
                entries={props.receiverLocals}></MyList>
              <MyList description='以下是数据链路层尚未处理的事件：'
                entries={receiverDataLinkEvent}></MyList>
              {
                props.hideAddEventButton ? null : <Box>
                  <Button variant="contained" onClick={() => addReceiverEvent(Event.CksumError)}>添加 Checksum Error 事件</Button>
                  <p></p>
                  {
                    props.addOldestFrameToTimeoutEvent ?
                      <Box>
                        <TextField label="超时 Timer 编号" variant="outlined" fullWidth onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                          setReceiverTimerIndex(event.target.value);
                        }} error={Number.isNaN(parseInt(receiverTimerIndex))} helperText="请输入整数" />
                        <Button variant="contained" disabled={Number.isNaN(parseInt(receiverTimerIndex))} onClick={() => addReceiverEvent([Event.Timeout, parseInt(receiverTimerIndex)])}>添加 Timeout 事件</Button>
                      </Box> :
                      <Button variant="contained" onClick={() => addReceiverEvent(Event.Timeout)}>添加 Timeout 事件</Button>
                  }
                  <p></p>
                  {
                    props.hideAddAckTimeoutEventButton ? null :
                      <Button variant="contained" onClick={() => addReceiverEvent(Event.AckTimeout)}>添加 Ack Timeout 事件</Button>
                  }
                </Box>
              }
            </Grid>
          </Grid>
        </Paper>
        <Paper sx={style2}>
          <Typography variant="h5">
            物理层
          </Typography>
          <MyList description='以下是物理层发送给数据链路层，但是数据链路层还没有接收的帧：'
            entries={receiverPhysicalToDataLink}></MyList>
          <p></p>
          <MyList description='以下是数据链路层发送给物理层，但是物理层还没有发送的帧：'
            hide={props.hideReceiverDataLinkToPhysical}
            entries={receiverDataLinkToPhysical}></MyList>
          <p></p>
          {
            props.hideReceiverDataLinkToPhysical ? null :
              <Button variant="contained" onClick={sendReceiverPhysical} disabled={receiverDataLinkToPhysical.length === 0}>发送</Button>
          }
        </Paper>
      </Paper>
    </Grid>
  </Grid>
}

import './App.css';
import { Container, Grid, Link, Paper, Typography } from '@mui/material';
import { Protocol1 } from './Protocol1';
import { Protocol2 } from './Protocol2';
import { Protocol3 } from './Protocol3';
import { Protocol4 } from './Protocol4';
import { Protocol5 } from './Protocol5';
import { Protocol6 } from './Protocol6';

function App() {
  return (
    <Container maxWidth={false}>
      <Grid container spacing={2}>
        <Grid item xs={12} sx={{
          padding: '10px'
        }}>
          <Paper sx={{
            padding: '30px',
          }}>
            <Typography variant="h3">
              数据链路层协议
            </Typography>
            <Typography>
              在学习《计算机网络原理》课程时，数据链路层协议是一个重难点。为了理解《计算机网络》教材上讲述的数据链路层协议，你可以在本页面中观察各个数据链路层协议的工作方式。
            </Typography>
            <Typography>
              注：本模拟器没有引入 Timer，需要你来手动触发 Timeout 事件。
            </Typography>
            <Typography>
              源代码：<Link href="https://github.com/thu-cs-lab/data-link-protocols">https://github.com/thu-cs-lab/data-link-protocols</Link>，欢迎提交贡献！
            </Typography>
            <Typography>
              TODO: 模拟物理层的乱序和丢包；重置协议状态；绘制出协议五和协议六的发送和接收窗口；绘制更好看的界面；显示 Timer 启动或停止状态；实现自动 Timeout 机制、自动模拟网络层发送机制
            </Typography>
          </Paper>
        </Grid>
        <Protocol1 />
        <Protocol2 />
        <Protocol3 />
        <Protocol4 />
        <Protocol5 />
        <Protocol6 />
      </Grid>
    </Container>
  );
}

export default App;

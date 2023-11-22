import './App.css';
import { Box, Container, Grid, Paper, Typography } from '@mui/material';
import { Protocol1 } from './Protocol1';
import { Protocol2 } from './Protocol2';
import { Protocol3 } from './Protocol3';
import { Protocol4 } from './Protocol4';
import { Protocol5 } from './Protocol5';

function App() {
  return (
    <Container maxWidth={false}>
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
        <Protocol1 />
        <Protocol2 />
        <Protocol3 />
        <Protocol4 />
        <Protocol5 />
      </Grid>
    </Container>
  );
}

export default App;

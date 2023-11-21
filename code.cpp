void sender1(void)
{
  frame s;                       /* buffer for an outbound frame */
  packet buffer;                 /* buffer for an outbound packet */
  while (true) {
    from_network_layer(&buffer); /* go get something to send */
    s.info = buffer;             /* copy it into s for transmission */
    to_physical_layer(&s);       /* send it on its way */
  }
}

void receiver1(void)
{
  frame r;
  event_type event;            /* filled in by wait, but not used here */
  while (true) {
    wait_for_event(&event);    /* only possibility is frame_arrival */
    from_physical_layer(&r);   /* go get the inbound frame */
    to_network_layer(&r.info); /* pass the data to the network layer */
  }
}

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
}

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
}

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
}

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
}

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
}

// Protocol 5

#define MAX_SEQ 7
static boolean between(seq_nr a, seq_nr b, seq_nr c)
{
  /* Return true if a <= b < c circularly; false otherwise. */
  if (((a <= b) && (b < c) || ((c < a) && (a <= b)) || ((b < c) && (c < a))))
    return (true);
  else
    return (false);
}

static void send_data(seq_nr frame_nr, seq_nr frame_expected, packet buffer[])
{
  /* Construct and send a data frame. */
  frame s;
  s.info = buffer[frame_nr];
  s.seq = frame_nr;
  s.ack = (frame_expected + MAX_SEQ) % (MAX_SEQ + 1);
  to_physical_layer(&s);
  start_timer(frame_nr);
}


void protocol5(void)
{
  seq_nr next_frame_to_send;
  seq_nr ack_expected;
  seq_nr frame_expected;
  frame r;
  packet buffer[MAX_SEQ + 1];
  seq_nr nbuffered;
  seq_nr i;
  event_type event;
  enable_network_layer();
  ack_expected = 0;
  next_frame_to_send = 0;
  frame_expected = 0;
  nbuffered = 0;
  while (true) {
    wait_for_event(&event);
    switch(event) {
      case network_layer_ready:
        /* Accept, save, and transmit a new frame. */
        from_network_layer(&buffer[next_frame_to_send]);
        nbuffered = nbuffered + 1;
        send_data(next_frame_to_send, frame_expected, buffer);
        inc(next_frame_to_send);
        break;

      case frame_arrival:
        from_physical_layer(&r);
        if (r.seq == frame_expected) {
          /* Frames are accepted only in order*/
          to_network_layer(&r.info);
          inc(frame_expected);
        }
        /* Ack n implies n - 1, n - 2, etc. Check for this. */
        while(between(ack_expected, r.ack, next_frame_to_send)) {
          /* Handle piggybacked ack. */
          nbuffered = nbuffered - 1;
          stop_timer(ack_expected);
          inc(ack_expected);
        }
        break;
      
      case cksum_err: break;

      case timeout:
        next_frame_to_send = ack_expected;
        for (i = 1;i <= nbuffered;i ++) {
          send_data(next_frame_to_send, frame_expected, buffer);
          inc(next_frame_to_send);
        }
    }
    if (nbuffered < MAX_SEQ)
      enable_network_layer();
    else
      disable_network_layer();
  }
}

// Protocol 6
#define MAX_SEQ 7
#define NR_BUFS ((MAX_SEQ + 1)/2)
boolean no_nak = true;
seq_nr oldest_frame = MAX_SEQ + 1;
static boolean between(seq_nr a, seq_nr b, seq_nr c)
{
  /* Same as between in protocol 5, but shorter and more obscure. */
  return ((a <= b) && (b < c) || ((c < a) && (a <= b)) || ((b < c) && (c < a)));
}

static void send_data(frame_kind fk, seq_nr frame_nr, seq_nr frame_expected, packet buffer[])
{
  /* Construct and send a data, ack or nak frame. */
  frame s;
  s.kind = fk;
  if (fk == data) s.info = buffer[frame_nr % NR_BUFS];
  s.seq = frame_nr;
  s.ack = (frame_expected + MAX_SEQ) % (MAX_SEQ + 1);
  if (fk == nak) no_nak = false;
  to_physical_layer(&s);
  if (fk == data) start_timer(frame_nr % NR_BUFS);
  stop_ack_timer();
}

void protocol6(void)
{
  seq_nr ack_expected;
  seq_nr next_frame_to_send;
  seq_nr frame_expected;
  seq_nr too_far;
  int i;
  frame r;
  packet out_buf[NR_BUFS];
  packet in_buf[NR_BUFS];
  boolean arrived[NR_BUFS];
  seq_nr nbuffered;
  event_type event;
  enable_network_layer();
  ack_expected = 0;
  too_far = NR_BUFS;
  nbuffered = 0;
  for (i = 0;i < NR_BUFS;i++) arrived[i] = false;
  while(true) {
    wait_for_event(&event);
    switch(event) {
      case network_layer_ready:
        nbuffered = nbuffered + 1;
        from_network_layer(&out_buf[next_frame_to_send % NR_BUFS]);
        send_frame(data, next_frame_to_send, frame_expected, out_buf);
        inc(next_frame_to_send);
        break;

      case frame_arrival:
        from_physical_layer(&r);
        if (r.kind == data) {
          /* An undamaged frame has arrived. */
          if ((r.seq != frame_expected) && no_nak)
            send_frame(nak, 0, frame_expected, out_buf); else start_ack_timer();
          if (between(frame_expected, r.seq, too_far) && arrived[r.seq % NR_BUFS] == false) {
            /* Frames may be accepted in any order. */
            arrived[r.seq % NR_BUFS] = true;
            in_buf[r.seq % NR_BUFS] = r.info;
            while (arrived[frame_expected % NR_BUFS]) {
              /* Pass frames and advance window. */
              to_network_layer(&in_buf[frame_expected % NR_BUFS]);
              no_nak = true;
              arrived[frame_expected % NR_BUFS] = false;
              inc(frame_expected);
              inc(too_far);
              start_ack_timer();
            }
          }
        }
        if ((r.kind == nak) && between(ack_expected, (r.ack + 1) % (MAX_SEQ + 1), next_frame_to_send))
          send_frame(data, (r.ack + 1) % (MAX_SEQ + 1), frame_expected, out_buf);
        while (between(ack_expected, r.ack, next_frame_to_send)) {
          nbuffered = nbuffered - 1;
          stop_timer(ack_expected % NR_BUFS);
          inc(ack_expected);
        }
        break;

      case cksum_err:
        if (no_nak) send_frame(nak, 0, frame_expected, out_buf);
        break;

      case timeout:
        send_frame(data, oldest_frame, frame_expected, out_buf);
        break;

      case ack_timeout:
        send_frame(ack, 0, frame_expected, out_buf);
    }
    if (nbuffered < NR_BUFS) enable_network_layer(); else disable_network_layer();
  }
}

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
  seq_nr next_frame_to_send;                /* seq number of next outgoing frame */
  frame s;                                  /* scratch variable */
  packet buffer;                            /* buffer for an outbound packet */
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

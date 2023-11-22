import { Box, List, ListItem, Typography } from '@mui/material';
import { HasToString } from './Common';

export type MyListProps = {
  entries: HasToString[];
  hide?: boolean;
  description: string;
};

export function MyList(props: MyListProps) {
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

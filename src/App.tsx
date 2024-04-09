import React, { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import { AutoSizer, CellMeasurer, CellMeasurerCache, InfiniteLoader, List, ListRowRenderer } from 'react-virtualized';
import { List as IMList } from "immutable";
import { createWebSocketConnection } from './utils/webSocketClient';

interface LogViewerProps {
  logData: IMList<string>;
  loadMoreRows: () => Promise<void>;
  forwardRef: MutableRefObject<List | null>;
  disabledAutoScroll: boolean;
}

const LogViewer: React.FC<LogViewerProps> = ({ logData, loadMoreRows, forwardRef, disabledAutoScroll }) => {
  const cache = new CellMeasurerCache({
    fixedWidth: true,
    defaultHeight: 20,
  });
  
  const rowRenderer: ListRowRenderer = ({ index, style, key, parent }) => {
    return (
      <CellMeasurer
        key={key}
        cache={cache}
        parent={parent}
        columnIndex={0}
        rowIndex={index}
      >
        {({ registerChild }) => (
          <div style={style} className="row" ref={registerChild as any}>
            <div className="content">
              <div>{logData.get(index)}</div>
            </div>
          </div>
        )}
      </CellMeasurer>
    );
  };
  
  const scrollToIndex = disabledAutoScroll ? -1 : logData.size - 1;
  
  return (
    <AutoSizer disableHeight>
      {({ width }) => (
        <InfiniteLoader
          isRowLoaded={({ index }) => !!logData.get(index)}
          loadMoreRows={loadMoreRows}
          rowCount={logData.size + 1}
        >
          {({ onRowsRendered, registerChild }) => (
            <List
              ref={el => {
                registerChild(el);
                forwardRef.current = el;
              }}
              height={800}
              onRowsRendered={onRowsRendered}
              rowCount={logData.size}
              rowHeight={cache.rowHeight}
              rowRenderer={rowRenderer}
              width={width}
              overscanRowCount={3}
              noRowsRenderer={() => <div>No rows</div>}
              scrollToIndex={scrollToIndex}
              scrollToAlignment="end"
            />
          )}
        </InfiniteLoader>
      )}
    </AutoSizer>
  );
};

const App = () => {
  const [logData, setLogData] = useState<IMList<string>>(IMList());
  const [socket, setSocket] = useState<WebSocket>();
  const [disabledAutoScroll, setDisabledAutoScroll] = useState(false);
  const listRef = useRef<List | null>(null);
  
  useEffect(() => {
    const socket = createWebSocketConnection((data: string[]) => {
      setLogData(prevData => prevData.concat(data));
    });
    
    setSocket(socket);
    
    return function cleanup() {
      if (socket) {
        socket.close();
      }
    };
  }, []);
  
  const loadMoreRows = useCallback(() => {
    return new Promise<void>((resolve) => {
      socket?.send("next");
      if (listRef.current) {
        listRef.current.recomputeRowHeights();
      }
      resolve();
    });
  }, [socket]);
  
  const handleClick = () => {
    setDisabledAutoScroll(!disabledAutoScroll);
  };
  
  return (
    <div style={{ padding: "20px 0 0 20px" }}>
      <button onClick={handleClick}>{disabledAutoScroll ? "Enable Auto Scroll" : "Disable Auto Scroll"}</button>
      <LogViewer logData={logData} loadMoreRows={loadMoreRows} forwardRef={listRef} disabledAutoScroll={disabledAutoScroll}/>
    </div>
  );
};

export default App;

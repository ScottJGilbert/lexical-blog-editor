import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import './index.css';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalEditable } from '@lexical/react/useLexicalEditable';
import { $computeTableMapSkipCellCheck, $getTableNodeFromLexicalNodeOrThrow, $getTableRowIndexFromTableCellNode, $isTableCellNode, $isTableRowNode, getDOMCellFromTarget, getTableElement, TableNode, } from '@lexical/table';
import { calculateZoomLevel, mergeRegister } from '@lexical/utils';
import { $getNearestNodeFromDOMNode, isHTMLElement, SKIP_SCROLL_INTO_VIEW_TAG, } from 'lexical';
import { useCallback, useEffect, useMemo, useRef, useState, } from 'react';
import { createPortal } from 'react-dom';
const MIN_ROW_HEIGHT = 33;
const MIN_COLUMN_WIDTH = 92;
const ACTIVE_RESIZER_COLOR = '#76b6ff';
function TableCellResizer({ editor }) {
    const targetRef = useRef(null);
    const resizerRef = useRef(null);
    const tableRectRef = useRef(null);
    const [hasTable, setHasTable] = useState(false);
    const pointerStartPosRef = useRef(null);
    const [pointerCurrentPos, updatePointerCurrentPos] = useState(null);
    const [activeCell, updateActiveCell] = useState(null);
    const [draggingDirection, updateDraggingDirection] = useState(null);
    const [hoveredDirection, updateHoveredDirection] = useState(null);
    const resetState = useCallback(() => {
        updateActiveCell(null);
        targetRef.current = null;
        updateDraggingDirection(null);
        updateHoveredDirection(null);
        pointerStartPosRef.current = null;
        tableRectRef.current = null;
    }, []);
    useEffect(() => {
        const tableKeys = new Set();
        return mergeRegister(editor.registerMutationListener(TableNode, (nodeMutations) => {
            for (const [nodeKey, mutation] of nodeMutations) {
                if (mutation === 'destroyed') {
                    tableKeys.delete(nodeKey);
                }
                else {
                    tableKeys.add(nodeKey);
                }
            }
            setHasTable(tableKeys.size > 0);
        }), editor.registerNodeTransform(TableNode, (tableNode) => {
            if (tableNode.getColWidths()) {
                return tableNode;
            }
            const numColumns = tableNode.getColumnCount();
            const columnWidth = MIN_COLUMN_WIDTH;
            tableNode.setColWidths(Array(numColumns).fill(columnWidth));
            return tableNode;
        }));
    }, [editor]);
    useEffect(() => {
        if (!hasTable) {
            return;
        }
        const onPointerMove = (event) => {
            const target = event.target;
            if (!isHTMLElement(target)) {
                return;
            }
            if (draggingDirection) {
                event.preventDefault();
                event.stopPropagation();
                updatePointerCurrentPos({
                    x: event.clientX,
                    y: event.clientY,
                });
                return;
            }
            if (resizerRef.current && resizerRef.current.contains(target)) {
                return;
            }
            if (targetRef.current !== target) {
                targetRef.current = target;
                const cell = getDOMCellFromTarget(target);
                if (cell && activeCell !== cell) {
                    editor.getEditorState().read(() => {
                        const tableCellNode = $getNearestNodeFromDOMNode(cell.elem);
                        if (!tableCellNode) {
                            throw new Error('TableCellResizer: Table cell node not found.');
                        }
                        const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
                        const tableElement = getTableElement(tableNode, editor.getElementByKey(tableNode.getKey()));
                        if (!tableElement) {
                            throw new Error('TableCellResizer: Table element not found.');
                        }
                        targetRef.current = target;
                        tableRectRef.current = tableElement.getBoundingClientRect();
                        updateActiveCell(cell);
                    }, { editor });
                }
                else if (cell == null) {
                    resetState();
                }
            }
        };
        const onPointerDown = (event) => {
            const isTouchEvent = event.pointerType === 'touch';
            if (isTouchEvent) {
                onPointerMove(event);
            }
        };
        const resizerContainer = resizerRef.current;
        resizerContainer === null || resizerContainer === void 0 ? void 0 : resizerContainer.addEventListener('pointermove', onPointerMove, {
            capture: true,
        });
        const removeRootListener = editor.registerRootListener((rootElement, prevRootElement) => {
            prevRootElement === null || prevRootElement === void 0 ? void 0 : prevRootElement.removeEventListener('pointermove', onPointerMove);
            prevRootElement === null || prevRootElement === void 0 ? void 0 : prevRootElement.removeEventListener('pointerdown', onPointerDown);
            rootElement === null || rootElement === void 0 ? void 0 : rootElement.addEventListener('pointermove', onPointerMove);
            rootElement === null || rootElement === void 0 ? void 0 : rootElement.addEventListener('pointerdown', onPointerDown);
        });
        return () => {
            removeRootListener();
            resizerContainer === null || resizerContainer === void 0 ? void 0 : resizerContainer.removeEventListener('pointermove', onPointerMove);
        };
    }, [activeCell, draggingDirection, editor, resetState, hasTable]);
    const isHeightChanging = (direction) => {
        if (direction === 'bottom') {
            return true;
        }
        return false;
    };
    const updateRowHeight = useCallback((heightChange) => {
        if (!activeCell) {
            throw new Error('TableCellResizer: Expected active cell.');
        }
        editor.update(() => {
            const tableCellNode = $getNearestNodeFromDOMNode(activeCell.elem);
            if (!$isTableCellNode(tableCellNode)) {
                throw new Error('TableCellResizer: Table cell node not found.');
            }
            const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
            const baseRowIndex = $getTableRowIndexFromTableCellNode(tableCellNode);
            const tableRows = tableNode.getChildren();
            // Determine if this is a full row merge by checking colspan
            const isFullRowMerge = tableCellNode.getColSpan() === tableNode.getColumnCount();
            // For full row merges, apply to first row. For partial merges, apply to last row
            const tableRowIndex = isFullRowMerge
                ? baseRowIndex
                : baseRowIndex + tableCellNode.getRowSpan() - 1;
            if (tableRowIndex >= tableRows.length || tableRowIndex < 0) {
                throw new Error('Expected table cell to be inside of table row.');
            }
            const tableRow = tableRows[tableRowIndex];
            if (!$isTableRowNode(tableRow)) {
                throw new Error('Expected table row');
            }
            let height = tableRow.getHeight();
            if (height === undefined) {
                const rowCells = tableRow.getChildren();
                height = Math.min(...rowCells.map((cell) => { var _a; return (_a = getCellNodeHeight(cell, editor)) !== null && _a !== void 0 ? _a : Infinity; }));
            }
            const newHeight = Math.max(height + heightChange, MIN_ROW_HEIGHT);
            tableRow.setHeight(newHeight);
        }, { tag: SKIP_SCROLL_INTO_VIEW_TAG });
    }, [activeCell, editor]);
    const getCellNodeHeight = (cell, activeEditor) => {
        const domCellNode = activeEditor.getElementByKey(cell.getKey());
        return domCellNode === null || domCellNode === void 0 ? void 0 : domCellNode.clientHeight;
    };
    const getCellColumnIndex = (tableCellNode, tableMap) => {
        for (let row = 0; row < tableMap.length; row++) {
            for (let column = 0; column < tableMap[row].length; column++) {
                if (tableMap[row][column].cell === tableCellNode) {
                    return column;
                }
            }
        }
    };
    const updateColumnWidth = useCallback((widthChange) => {
        if (!activeCell) {
            throw new Error('TableCellResizer: Expected active cell.');
        }
        editor.update(() => {
            const tableCellNode = $getNearestNodeFromDOMNode(activeCell.elem);
            if (!$isTableCellNode(tableCellNode)) {
                throw new Error('TableCellResizer: Table cell node not found.');
            }
            const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
            const [tableMap] = $computeTableMapSkipCellCheck(tableNode, null, null);
            const columnIndex = getCellColumnIndex(tableCellNode, tableMap);
            if (columnIndex === undefined) {
                throw new Error('TableCellResizer: Table column not found.');
            }
            const colWidths = tableNode.getColWidths();
            if (!colWidths) {
                return;
            }
            const width = colWidths[columnIndex];
            if (width === undefined) {
                return;
            }
            const newColWidths = [...colWidths];
            const newWidth = Math.max(width + widthChange, MIN_COLUMN_WIDTH);
            newColWidths[columnIndex] = newWidth;
            tableNode.setColWidths(newColWidths);
        }, { tag: SKIP_SCROLL_INTO_VIEW_TAG });
    }, [activeCell, editor]);
    const pointerUpHandler = useCallback((direction) => {
        const handler = (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!activeCell) {
                throw new Error('TableCellResizer: Expected active cell.');
            }
            if (pointerStartPosRef.current) {
                const { x, y } = pointerStartPosRef.current;
                if (activeCell === null) {
                    return;
                }
                const zoom = calculateZoomLevel(event.target);
                if (isHeightChanging(direction)) {
                    const heightChange = (event.clientY - y) / zoom;
                    updateRowHeight(heightChange);
                }
                else {
                    const widthChange = (event.clientX - x) / zoom;
                    updateColumnWidth(widthChange);
                }
                resetState();
                document.removeEventListener('pointerup', handler);
            }
        };
        return handler;
    }, [activeCell, resetState, updateColumnWidth, updateRowHeight]);
    const toggleResize = useCallback((direction) => (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!activeCell) {
            throw new Error('TableCellResizer: Expected active cell.');
        }
        pointerStartPosRef.current = {
            x: event.clientX,
            y: event.clientY,
        };
        updatePointerCurrentPos(pointerStartPosRef.current);
        updateDraggingDirection(direction);
        document.addEventListener('pointerup', pointerUpHandler(direction));
    }, [activeCell, pointerUpHandler]);
    const getResizers = useCallback(() => {
        if (activeCell) {
            const { height, width, top, left } = activeCell.elem.getBoundingClientRect();
            const zoom = calculateZoomLevel(activeCell.elem);
            const zoneWidth = 16; // Pixel width of the zone where you can drag the edge
            const styles = {
                bottom: {
                    backgroundColor: 'none',
                    cursor: 'row-resize',
                    height: `${zoneWidth}px`,
                    left: `${window.scrollX + left}px`,
                    top: `${window.scrollY + top + height - zoneWidth / 2}px`,
                    width: `${width}px`,
                },
                right: {
                    backgroundColor: 'none',
                    cursor: 'col-resize',
                    height: `${height}px`,
                    left: `${window.scrollX + left + width - zoneWidth / 2}px`,
                    top: `${window.scrollY + top}px`,
                    width: `${zoneWidth}px`,
                },
            };
            const tableRect = tableRectRef.current;
            if (draggingDirection && pointerCurrentPos && tableRect) {
                if (isHeightChanging(draggingDirection)) {
                    styles[draggingDirection].left = `${window.scrollX + tableRect.left}px`;
                    styles[draggingDirection].top = `${window.scrollY + pointerCurrentPos.y / zoom}px`;
                    styles[draggingDirection].height = '3px';
                    styles[draggingDirection].width = `${tableRect.width}px`;
                }
                else {
                    styles[draggingDirection].top = `${window.scrollY + tableRect.top}px`;
                    styles[draggingDirection].left = `${window.scrollX + pointerCurrentPos.x / zoom}px`;
                    styles[draggingDirection].width = '3px';
                    styles[draggingDirection].height = `${tableRect.height}px`;
                }
                styles[draggingDirection].backgroundColor = '#adf';
                styles[draggingDirection].mixBlendMode = 'unset';
            }
            else if (!draggingDirection && hoveredDirection === 'right') {
                const halfZoneWidth = zoneWidth / 2;
                const highlightWidth = 2;
                const highlightStart = halfZoneWidth - highlightWidth / 2;
                styles.right.backgroundColor = `linear-gradient(90deg, transparent ${highlightStart}px, ${ACTIVE_RESIZER_COLOR} ${highlightStart}px, ${ACTIVE_RESIZER_COLOR} ${highlightStart + highlightWidth}px, transparent ${highlightStart + highlightWidth}px)`;
                styles.right.mixBlendMode = 'unset';
                if (tableRect) {
                    styles.right.top = `${window.scrollY + tableRect.top}px`;
                    styles.right.height = `${tableRect.height}px`;
                }
            }
            return styles;
        }
        return {
            bottom: null,
            left: null,
            right: null,
            top: null,
        };
    }, [activeCell, draggingDirection, hoveredDirection, pointerCurrentPos]);
    const handlePointerEnter = useCallback((direction) => () => {
        if (!draggingDirection) {
            updateHoveredDirection(direction);
        }
    }, [draggingDirection]);
    const handlePointerLeave = useCallback(() => {
        if (!draggingDirection) {
            updateHoveredDirection(null);
        }
    }, [draggingDirection]);
    const resizerStyles = getResizers();
    return (_jsx("div", { ref: resizerRef, children: activeCell != null && (_jsxs(_Fragment, { children: [_jsx("div", { className: "TableCellResizer__resizer TableCellResizer__ui", style: resizerStyles.right || undefined, onPointerEnter: handlePointerEnter('right'), onPointerLeave: handlePointerLeave, onPointerDown: toggleResize('right') }), _jsx("div", { className: "TableCellResizer__resizer TableCellResizer__ui", style: resizerStyles.bottom || undefined, onPointerDown: toggleResize('bottom') })] })) }));
}
export default function TableCellResizerPlugin() {
    const [editor] = useLexicalComposerContext();
    const isEditable = useLexicalEditable();
    return useMemo(() => isEditable
        ? createPortal(_jsx(TableCellResizer, { editor: editor }), document.body)
        : null, [editor, isEditable]);
}

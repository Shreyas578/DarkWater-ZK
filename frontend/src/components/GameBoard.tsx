// =============================================================
// DarkWater ZK — Game Board Component
// Displays attack board and defense board side by side
// =============================================================

import React from 'react'
import { Shot } from '../hooks/useGame'
import { ShipPlacement } from '../zk/boardProver'
import { BOARD_SIZE } from '../stellar/config'

interface GameBoardProps {
    myShips: ShipPlacement[]
    myShots: Shot[]          // shots I fired at opponent
    incomingShots: Shot[]    // shots opponent fired at me
    isMyTurn: boolean
    onFire: (row: number, col: number) => void
    disabled: boolean
}

function getOccupiedCells(ships: ShipPlacement[]): Set<string> {
    const cells = new Set<string>()
    for (const ship of ships) {
        for (let i = 0; i < ship.length; i++) {
            const r = ship.orientation === 1 ? ship.row + i : ship.row
            const c = ship.orientation === 0 ? ship.col + i : ship.col
            cells.add(`${r},${c}`)
        }
    }
    return cells
}

interface BoardProps {
    label: string
    ships?: ShipPlacement[]
    shots: Shot[]
    clickable: boolean
    onCellClick?: (row: number, col: number) => void
    idPrefix: string
}

function Board({ label, ships, shots, clickable, onCellClick, idPrefix }: BoardProps) {
    const occupiedCells = ships ? getOccupiedCells(ships) : new Set<string>()
    const shotMap = new Map<string, Shot>()
    shots.forEach(s => shotMap.set(`${s.row},${s.col}`, s))

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ textAlign: 'center' }}>
                <span style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                }}>
                    {label}
                </span>
            </div>

            {/* Column labels */}
            <div style={{ display: 'grid', gridTemplateColumns: '20px repeat(10, 40px)', gap: '3px' }}>
                <div />
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: '20px' }}>
                        {String.fromCharCode(65 + i)}
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', gap: '3px' }}>
                {/* Row labels */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} style={{ height: '40px', display: 'flex', alignItems: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', width: '20px', justifyContent: 'center' }}>
                            {i + 1}
                        </div>
                    ))}
                </div>

                <div className="board-grid">
                    {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, idx) => {
                        const row = Math.floor(idx / BOARD_SIZE)
                        const col = idx % BOARD_SIZE
                        const key = `${row},${col}`
                        const shot = shotMap.get(key)
                        const isOccupied = occupiedCells.has(key)

                        let className = 'board-cell'
                        let content = ''

                        if (shot) {
                            if (shot.result === 'hit') { className += ' cell-hit'; content = '💥' }
                            else if (shot.result === 'miss') { className += ' cell-miss'; content = '🌊' }
                            else { className += ' cell-pending'; content = '⏳' }
                        } else if (isOccupied && ships) {
                            className += ' cell-ship'
                        }

                        return (
                            <div
                                key={idx}
                                id={`${idPrefix}-${row}-${col}`}
                                className={className}
                                style={{ cursor: clickable && !shot ? 'crosshair' : 'default' }}
                                onClick={() => clickable && !shot && onCellClick?.(row, col)}
                            >
                                {content}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export function GameBoard({
    myShips,
    myShots,
    incomingShots,
    isMyTurn,
    onFire,
    disabled,
}: GameBoardProps) {
    return (
        <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {/* My board — show ships, incoming shots */}
            <div className="card">
                <Board
                    label="My Ocean (Defense)"
                    ships={myShips}
                    shots={incomingShots}
                    clickable={false}
                    idPrefix="my"
                />
                <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                        🔐 Board hidden by ZK commitment
                    </span>
                </div>
            </div>

            {/* Opponent board — fire shots here */}
            <div className="card" style={{ border: isMyTurn ? '1px solid var(--teal)' : undefined }}>
                <Board
                    label={isMyTurn ? '🎯 Enemy Waters — YOUR TURN' : 'Enemy Waters'}
                    shots={myShots}
                    clickable={isMyTurn && !disabled}
                    onCellClick={onFire}
                    idPrefix="enemy"
                />
                {isMyTurn && (
                    <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                        <span style={{ color: 'var(--teal)', fontSize: '0.8rem', fontFamily: 'var(--font-display)' }}>
                            Click a cell to fire!
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}

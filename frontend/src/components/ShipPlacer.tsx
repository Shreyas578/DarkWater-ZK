// =============================================================
// DarkWater ZK — Ship Placer Component
// Interactive 10×10 grid for placing ships before the game
// =============================================================

import React, { useState, useCallback } from 'react'
import { ShipPlacement } from '../zk/boardProver'
import { SHIP_SIZES, SHIP_NAMES, BOARD_SIZE } from '../stellar/config'

interface ShipPlacerProps {
    onConfirm: (ships: ShipPlacement[]) => void
    isProving: boolean
    proofStatus: string | null
}

type Orientation = 0 | 1

interface PlacingShip {
    index: number
    orientation: Orientation
}

export function ShipPlacer({ onConfirm, isProving, proofStatus }: ShipPlacerProps) {
    // Ships placed so far
    const [placed, setPlaced] = useState<(ShipPlacement | null)[]>(Array(5).fill(null))
    // Which ship index is currently being placed
    const [placing, setPlacing] = useState<PlacingShip | null>(null)
    // Hover preview cells
    const [hoverCells, setHoverCells] = useState<Set<string>>(new Set())

    const getCellsForShip = useCallback((row: number, col: number, length: number, orientation: Orientation): Array<[number, number]> => {
        const cells: Array<[number, number]> = []
        for (let i = 0; i < length; i++) {
            const r = orientation === 1 ? row + i : row
            const c = orientation === 0 ? col + i : col
            if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                cells.push([r, c])
            }
        }
        return cells
    }, [])

    const isValidPlacement = useCallback((cells: Array<[number, number]>, excludeIndex?: number): boolean => {
        if (cells.length < SHIP_SIZES[placing?.index ?? 0]) return false
        const occupiedCells = new Set<string>()
        placed.forEach((ship, i) => {
            if (!ship || i === excludeIndex) return
            for (let j = 0; j < ship.length; j++) {
                const r = ship.orientation === 1 ? ship.row + j : ship.row
                const c = ship.orientation === 0 ? ship.col + j : ship.col
                occupiedCells.add(`${r},${c}`)
            }
        })
        return cells.every(([r, c]) => !occupiedCells.has(`${r},${c}`))
    }, [placed, placing])

    const handleCellHover = useCallback((row: number, col: number) => {
        if (!placing) return
        const length = SHIP_SIZES[placing.index]
        const cells = getCellsForShip(row, col, length, placing.orientation)
        setHoverCells(new Set(cells.map(([r, c]) => `${r},${c}`)))
    }, [placing, getCellsForShip])

    const handleCellClick = useCallback((row: number, col: number) => {
        if (!placing) return
        const length = SHIP_SIZES[placing.index]
        const cells = getCellsForShip(row, col, length, placing.orientation)

        if (!isValidPlacement(cells, placing.index)) return

        const newPlaced = [...placed]
        newPlaced[placing.index] = { row, col, length, orientation: placing.orientation }
        setPlaced(newPlaced)
        setPlacing(null)
        setHoverCells(new Set())
    }, [placing, placed, getCellsForShip, isValidPlacement])

    const getCellState = useCallback((row: number, col: number): string => {
        const key = `${row},${col}`

        // Check if this cell is part of a placed ship
        for (const ship of placed) {
            if (!ship) continue
            for (let i = 0; i < ship.length; i++) {
                const r = ship.orientation === 1 ? ship.row + i : ship.row
                const c = ship.orientation === 0 ? ship.col + i : ship.col
                if (r === row && c === col) return 'cell-ship'
            }
        }

        if (hoverCells.has(key)) return 'cell-hover'
        return ''
    }, [placed, hoverCells])

    const allPlaced = placed.every(s => s !== null)

    const handleConfirm = () => {
        if (!allPlaced) return
        onConfirm(placed as ShipPlacement[])
    }

    const handleReset = () => {
        setPlaced(Array(5).fill(null))
        setPlacing(null)
        setHoverCells(new Set())
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
            <div>
                <h2 style={{ textAlign: 'center', marginBottom: '0.25rem' }}>Place Your Fleet</h2>
                <p className="text-muted" style={{ textAlign: 'center' }}>
                    Your placement is <span style={{ color: 'var(--teal)' }}>never revealed</span> — protected by ZK proofs
                </p>
            </div>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                {/* Ship Palette */}
                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>Fleet</h3>
                    <div className="ship-palette">
                        {SHIP_SIZES.map((size, i) => (
                            <div
                                key={i}
                                className={`ship-item ${placed[i] ? 'ship-placed' : ''} ${placing?.index === i ? 'ship-item-active' : ''}`}
                                style={{
                                    cursor: placed[i] ? 'not-allowed' : 'pointer',
                                    border: placing?.index === i ? '1px solid var(--teal)' : undefined,
                                    background: placing?.index === i ? 'rgba(0,201,177,0.15)' : undefined,
                                }}
                                onClick={() => !placed[i] && setPlacing({ index: i, orientation: placing?.index === i ? (placing.orientation === 0 ? 1 : 0) : 0 })}
                            >
                                <div className="ship-cells-preview">
                                    {Array.from({ length: size }).map((_, j) => (
                                        <div key={j} className="ship-cell-dot"
                                            style={{ opacity: placed[i] ? 0.3 : 1 }} />
                                    ))}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{SHIP_NAMES[i]}</div>
                                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{size} cells</div>
                                </div>
                                {placed[i] && <span style={{ color: 'var(--teal)', fontSize: '0.75rem' }}>✓</span>}
                            </div>
                        ))}
                    </div>

                    {placing && (
                        <div style={{ marginTop: '1rem' }}>
                            <button
                                className="btn btn-secondary"
                                style={{ width: '100%', fontSize: '0.75rem' }}
                                onClick={() => setPlacing({ ...placing, orientation: placing.orientation === 0 ? 1 : 0 })}
                            >
                                ↻ Rotate ({placing.orientation === 0 ? 'Horizontal' : 'Vertical'})
                            </button>
                        </div>
                    )}

                    {placing && (
                        <div className="text-muted" style={{ marginTop: '0.75rem', fontSize: '0.75rem', textAlign: 'center' }}>
                            Click a cell to place {SHIP_NAMES[placing.index]}
                        </div>
                    )}
                </div>

                {/* Board */}
                <div>
                    {/* Column Labels */}
                    <div style={{ display: 'grid', gridTemplateColumns: '20px repeat(10, 40px)', marginBottom: '3px', gap: '3px' }}>
                        <div />
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '20px' }}>
                                {String.fromCharCode(65 + i)}
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '3px' }}>
                        {/* Row Labels */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {Array.from({ length: 10 }).map((_, i) => (
                                <div key={i} style={{ height: '40px', display: 'flex', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', width: '20px', justifyContent: 'center' }}>
                                    {i + 1}
                                </div>
                            ))}
                        </div>

                        {/* Grid */}
                        <div
                            className="board-grid"
                            onMouseLeave={() => setHoverCells(new Set())}
                        >
                            {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, idx) => {
                                const row = Math.floor(idx / BOARD_SIZE)
                                const col = idx % BOARD_SIZE
                                const state = getCellState(row, col)
                                return (
                                    <div
                                        key={idx}
                                        id={`cell-${row}-${col}`}
                                        className={`board-cell ${state}`}
                                        style={{
                                            background: state === 'cell-hover' ? 'rgba(0,201,177,0.2)' : undefined,
                                            borderColor: state === 'cell-hover' ? 'var(--teal)' : undefined,
                                        }}
                                        onMouseEnter={() => handleCellHover(row, col)}
                                        onClick={() => handleCellClick(row, col)}
                                    />
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="btn btn-secondary" onClick={handleReset} disabled={isProving}>
                    ↺ Reset Board
                </button>
                <button
                    className="btn btn-primary"
                    onClick={handleConfirm}
                    disabled={!allPlaced || isProving}
                    id="submit-board-btn"
                >
                    {isProving ? (
                        <><div className="spinner" style={{ width: 16, height: 16 }} /> Generating Proof...</>
                    ) : (
                        '🔐 Submit Board & Prove'
                    )}
                </button>
            </div>

            {proofStatus && (
                <div className="proof-banner">
                    {proofStatus}
                </div>
            )}
        </div>
    )
}

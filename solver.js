/**
 * 华容道真·专家求解器 (V2.0)
 * 专门适配拼图版华容道：每个棋子都是唯一的
 */
const HuarongSolver = {
    /**
     * 获取局面的唯一状态字符串
     * 拼图版每个棋子ID必须唯一参与序列化
     */
    getExactState: function(pieces) {
        // 按照 ID 排序保证状态唯一性
        const sorted = [...pieces].sort((a, b) => a.id.localeCompare(b.id));
        let state = "";
        for (let i = 0; i < sorted.length; i++) {
            state += sorted[i].x.toString() + sorted[i].y.toString();
        }
        return state;
    },

    /**
     * 求解最短路径
     */
    findNextStep: function(currentPieces, targetLayout, onProgress) {
        const targetStateStr = this.getExactState(targetLayout);
        const startStateStr = this.getExactState(currentPieces);
        
        if (startStateStr === targetStateStr) return null;

        // 队列存储：{ 棋子状态, 第一步动作 }
        let queue = [{ 
            ps: currentPieces, 
            firstMove: null 
        }];
        
        let visited = new Set();
        visited.add(startStateStr);

        let head = 0;
        // 大幅提升搜索上限：50万次迭代
        const MAX_ITERATIONS = 500000; 
        
        // 预先建立棋子 ID 索引，加速访问
        const targetMap = {};
        targetLayout.forEach(p => { if(!p.type.includes('dummy')) targetMap[p.id] = {x: p.x, y: p.y}; });

        while (head < queue.length && head < MAX_ITERATIONS) {
            const { ps, firstMove } = queue[head++];
            
            // 每 10000 次迭代更新一次 UI 进度（如果需要）
            if (head % 10000 === 0 && onProgress) {
                onProgress(Math.floor((head / MAX_ITERATIONS) * 100));
            }

            // 检查是否达到目标状态 (只检查非 dummy 棋子)
            let isWin = true;
            for (let i = 0; i < ps.length; i++) {
                const p = ps[i];
                if (p.type.includes('dummy')) continue;
                const target = targetMap[p.id];
                if (p.x !== target.x || p.y !== target.y) {
                    isWin = false;
                    break;
                }
            }

            if (isWin) {
                console.log(`专家寻路成功！在第 ${head} 个节点找到解。`);
                return firstMove;
            }

            // 探索邻居节点
            const moves = this.getValidMoves(ps);
            for (let i = 0; i < moves.length; i++) {
                const move = moves[i];
                const nextPs = this.applyMove(ps, move);
                const stateStr = this.getExactState(nextPs);
                
                if (!visited.has(stateStr)) {
                    visited.add(stateStr);
                    queue.push({
                        ps: nextPs,
                        firstMove: firstMove || move
                    });
                }
            }
        }

        console.warn("专家尽力了，但在搜索范围内未找到解。");
        return null;
    },

    getValidMoves: function(pieces) {
        const grid = [
            [null, null, null, null],
            [null, null, null, null],
            [null, null, null, null],
            [null, null, null, null],
            [null, null, null, null]
        ];
        
        for (let i = 0; i < pieces.length; i++) {
            const p = pieces[i];
            for (let r = p.y; r < p.y + p.h; r++) {
                for (let c = p.x; c < p.x + p.w; c++) {
                    grid[r][c] = p.id;
                }
            }
        }

        const moves = [];
        const dirs = [[1,0], [-1,0], [0,1], [0,-1]];

        for (let i = 0; i < pieces.length; i++) {
            const p = pieces[i];
            for (let j = 0; j < dirs.length; j++) {
                const [dx, dy] = dirs[j];
                const nx = p.x + dx, ny = p.y + dy;
                
                if (nx >= 0 && ny >= 0 && nx + p.w <= 4 && ny + p.h <= 5) {
                    let blocked = false;
                    for (let r = ny; r < ny + p.h; r++) {
                        for (let c = nx; c < nx + p.w; c++) {
                            if (grid[r][c] && grid[r][c] !== p.id) {
                                blocked = true;
                                break;
                            }
                        }
                        if (blocked) break;
                    }
                    if (!blocked) moves.push({ pieceId: p.id, dx, dy });
                }
            }
        }
        return moves;
    },

    applyMove: function(pieces, move) {
        const next = [];
        for (let i = 0; i < pieces.length; i++) {
            const p = pieces[i];
            if (p.id === move.pieceId) {
                next.push({ ...p, x: p.x + move.dx, y: p.y + move.dy });
            } else {
                next.push({ ...p });
            }
        }
        return next;
    }
};

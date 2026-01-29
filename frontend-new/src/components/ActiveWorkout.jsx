import React, { useMemo } from 'react';
import { Minimize2, Dumbbell, Trophy, Check, Award, Plus, X, Play } from 'lucide-react';

const ActiveWorkout = React.memo(({
    activeWorkout,
    updateWorkoutSet,
    addWorkoutSet,
    finishWorkout,
    setWorkoutMinimized,
    workoutTimer,
    activeCardioTimer,
    toggleCardioTimer,
    formatTime,
    exerciseList,
    getExerciseRecord
}) => {
    const { program, exerciseSets } = activeWorkout;

    const { totalVolume, totalSets, totalCardioTime, hasOnlyCardio } = useMemo(() => {
        let vol = 0, sets = 0, cardio = 0;
        program.exercises?.forEach((ex, exIdx) => {
            const isCardio = ex.name === 'Скакалка' || (exerciseList['Кардио'] && exerciseList['Кардио'].includes(ex.name));
            const sArr = exerciseSets[exIdx] || [];

            sArr.forEach(s => {
                if (s.completed) {
                    sets++;
                    if (isCardio) {
                        cardio += parseInt(s.prevWeight) || parseInt(s.weight) || 0;
                    } else {
                        vol += (parseFloat(s.weight) || parseFloat(s.prevWeight) || 0) * (parseInt(s.reps) || parseInt(s.prevReps) || 0);
                    }
                }
            });
        });

        const onlyCardio = program.exercises?.every(ex =>
            ex.name === 'Скакалка' || (exerciseList['Кардио'] && exerciseList['Кардио'].includes(ex.name))
        );

        return { totalVolume: vol, totalSets: sets, totalCardioTime: cardio, hasOnlyCardio: onlyCardio };
    }, [program, exerciseSets, exerciseList]);

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-white pb-4">
            <div className="sticky top-0 bg-[#0d0d0d]/95 backdrop-blur border-b border-white/10 p-3 z-10">
                <div className="flex items-center justify-between">
                    <button onClick={() => setWorkoutMinimized(true)} className="flex items-center gap-2 text-gray-400 hover:text-white">
                        <Minimize2 className="w-5 h-5" /><span>Свернуть</span>
                    </button>
                    <div className="bg-blue-500/20 text-blue-400 px-4 py-2 rounded-full font-mono font-bold text-lg">
                        {formatTime(workoutTimer)}
                    </div>
                    <button onClick={finishWorkout} className="bg-green-500 text-white px-4 py-2 rounded-lg font-medium">
                        Завершить
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 p-4 border-b border-white/10">
                <div className="bg-[#1a1a1a] rounded-xl p-3 text-center">
                    <div className="text-blue-400 font-bold text-xl">{formatTime(workoutTimer)}</div>
                    <div className="text-xs text-gray-500">Время</div>
                </div>
                <div className="bg-[#1a1a1a] rounded-xl p-3 text-center">
                    {hasOnlyCardio ? (
                        <>
                            <div className="font-bold text-xl text-green-400">{formatTime(totalCardioTime)}</div>
                            <div className="text-xs text-gray-500">Кардио</div>
                        </>
                    ) : (
                        <>
                            <div className="font-bold text-xl">{Math.round(totalVolume)}</div>
                            <div className="text-xs text-gray-500">Объём (кг)</div>
                        </>
                    )}
                </div>
                <div className="bg-[#1a1a1a] rounded-xl p-3 text-center">
                    <div className="font-bold text-xl">{totalSets}</div>
                    <div className="text-xs text-gray-500">Подходов</div>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {program.exercises?.map((ex, exIdx) => {
                    const record = getExerciseRecord(ex.name);
                    const isCardio = ex.name === 'Скакалка' || (exerciseList['Кардио'] && exerciseList['Кардио'].includes(ex.name));

                    return (
                        <div key={exIdx} className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5">
                            <div className="flex items-center justify-between p-4 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                        <Dumbbell className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-blue-400">{ex.name || 'Упражнение'}</h3>
                                        {record && !isCardio && (
                                            <div className="flex items-center gap-1 text-xs text-yellow-500">
                                                <Trophy className="w-3 h-3" />
                                                <span>Рекорд: {record.weight}кг × {record.reps}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="px-4">
                                <div className="grid grid-cols-12 gap-2 py-3 text-xs text-gray-500 font-medium border-b border-white/5">
                                    <div className="col-span-2">СЕТ</div>
                                    {isCardio ? (
                                        <div className="col-span-8 text-center">ВРЕМЯ</div>
                                    ) : (
                                        <>
                                            <div className="col-span-3 text-center">ПРЕД.</div>
                                            <div className="col-span-3 text-center">КГ</div>
                                            <div className="col-span-2 text-center">ПОВТ</div>
                                        </>
                                    )}
                                    <div className="col-span-2 text-center">✓</div>
                                </div>

                                {exerciseSets[exIdx]?.map((set, setIdx) => {
                                    const isNewWeightRecord = !isCardio && set.completed && set.weight && record && parseFloat(set.weight) > record.weight;
                                    const isNewRepsRecord = !isCardio && set.completed && set.reps && record && parseFloat(set.weight) >= record.weight && parseInt(set.reps) > record.reps;
                                    const isNewRecord = isNewWeightRecord || isNewRepsRecord;

                                    const isTimerActive = activeCardioTimer?.exIdx === exIdx && activeCardioTimer?.setIdx === setIdx;
                                    const seconds = parseInt(set.weight) || 0;

                                    return (
                                        <div key={setIdx} className={`grid grid-cols-12 gap-2 py-3 items-center border-b border-white/5 ${set.completed ? isNewRecord ? 'bg-yellow-500/10' : 'bg-green-500/10' : ''}`}>
                                            <div className="col-span-2 font-bold text-lg">{setIdx + 1}</div>

                                            {isCardio ? (
                                                <div className="col-span-8 flex items-center justify-center gap-2">
                                                    <button onClick={() => updateWorkoutSet(exIdx, setIdx, 'weight', Math.max(0, seconds - 10))} className="p-2 bg-[#0d0d0d] rounded-lg text-gray-400 hover:text-white text-xs">-10с</button>
                                                    <div className={`font-mono text-xl font-bold w-16 text-center ${isTimerActive ? 'text-green-400' : 'text-white'}`}>
                                                        {formatTime(seconds)}
                                                    </div>
                                                    <button onClick={() => updateWorkoutSet(exIdx, setIdx, 'weight', seconds + 10)} className="p-2 bg-[#0d0d0d] rounded-lg text-gray-400 hover:text-white text-xs">+10с</button>

                                                    <button onClick={() => toggleCardioTimer(exIdx, setIdx)}
                                                        className={`p-2 rounded-lg transition-colors ${isTimerActive ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'}`}>
                                                        {isTimerActive ? <X className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="col-span-3 text-center text-gray-500 text-sm">
                                                        {set.prevWeight ? `${set.prevWeight}×${set.prevReps}` : '—'}
                                                    </div>
                                                    <div className="col-span-3">
                                                        <input type="number" value={set.weight} onChange={(e) => updateWorkoutSet(exIdx, setIdx, 'weight', e.target.value)}
                                                            placeholder={set.prevWeight || '0'}
                                                            className="w-full bg-[#0d0d0d] text-center py-2 rounded-lg border border-white/10 outline-none focus:border-blue-500 font-medium text-white" />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <input type="number" value={set.reps} onChange={(e) => updateWorkoutSet(exIdx, setIdx, 'reps', e.target.value)}
                                                            placeholder={set.prevReps || '0'}
                                                            className="w-full bg-[#0d0d0d] text-center py-2 rounded-lg border border-white/10 outline-none focus:border-blue-500 font-medium text-white" />
                                                    </div>
                                                </>
                                            )}

                                            <div className="col-span-2 flex justify-center">
                                                <button onClick={() => updateWorkoutSet(exIdx, setIdx, 'completed', !set.completed)}
                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${set.completed ? isNewRecord ? 'bg-yellow-500 text-black scale-110' : 'bg-green-500 text-white scale-110' : 'bg-[#0d0d0d] border border-white/20 hover:border-green-500'}`}>
                                                    {set.completed && <Check className="w-5 h-5" />}
                                                </button>
                                            </div>
                                            {isNewRecord && (
                                                <div className="col-span-12 flex items-center gap-1 text-yellow-500 text-xs mt-1">
                                                    <Award className="w-3 h-3" />
                                                    <span>Новый рекорд!</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <button onClick={() => addWorkoutSet(exIdx)} className="w-full py-3 text-blue-400 hover:bg-blue-500/10 flex items-center justify-center gap-2 transition-colors">
                                <Plus className="w-4 h-4" />Добавить сет
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

export default ActiveWorkout;

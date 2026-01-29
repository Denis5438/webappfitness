import React, { useState, useMemo } from 'react';
import { ChevronLeft, Save, Trash2, Plus, Search, ChevronRight, X } from 'lucide-react';

const ProgramEditor = React.memo(({
    program,
    setProgram,
    onSave,
    onClose,
    onDelete,
    exerciseList,
    categoryEmojis,
    programs
}) => {
    const [showExerciseSelector, setShowExerciseSelector] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [marketFilter, setMarketFilter] = useState('Все');
    const [selectorTargetIndex, setSelectorTargetIndex] = useState(null);

    const filteredExercises = useMemo(() => {
        return Object.entries(exerciseList).flatMap(([cat, exercises]) => {
            if (marketFilter !== 'Все' && marketFilter !== cat) return [];
            return exercises
                .filter(name => !searchQuery || name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(name => ({ name, cat }));
        });
    }, [exerciseList, marketFilter, searchQuery]);

    if (showExerciseSelector) {
        return (
            <div className="fixed inset-0 bg-[#0d0d0d] z-50 flex flex-col">
                <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-[#0d0d0d] sticky top-0 z-10">
                    <button onClick={() => setShowExerciseSelector(false)} className="p-2 -ml-2 text-gray-400">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex-1 bg-[#1a1a1a] rounded-xl flex items-center px-3 h-10 border border-white/10">
                        <Search className="w-4 h-4 text-gray-500 mr-2" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent flex-1 outline-none text-sm text-white"
                            placeholder="Поиск упражнения..."
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                        <button
                            onClick={() => setMarketFilter('Все')}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${marketFilter === 'Все' ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25' : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#252525]'}`}
                        >
                            {categoryEmojis['Все']} Все
                        </button>
                        {Object.keys(exerciseList).map(cat => (
                            <button
                                key={cat}
                                onClick={() => setMarketFilter(cat)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${marketFilter === cat ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25' : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#252525]'}`}
                            >
                                {categoryEmojis[cat]} {cat}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {filteredExercises.map((item, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    const newExercises = program.exercises.map((ex, i) =>
                                        i === selectorTargetIndex ? { ...ex, name: item.name, isCustom: false } : ex
                                    );
                                    setProgram({ ...program, exercises: newExercises });
                                    setShowExerciseSelector(false);
                                    setSearchQuery('');
                                }}
                                className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] p-4 rounded-xl border border-white/10 text-left hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200 flex flex-col gap-3 relative group active:scale-95"
                            >
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center text-2xl group-hover:from-blue-500 group-hover:to-purple-500 group-hover:text-white transition-all duration-200">
                                    {categoryEmojis[item.cat] || '🏋️'}
                                </div>
                                <div>
                                    <div className="font-semibold text-sm line-clamp-2 text-white/90 group-hover:text-white">{item.name}</div>
                                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-blue-500/50"></span>
                                        {item.cat}
                                    </div>
                                </div>
                            </button>
                        ))}

                        <button
                            onClick={() => {
                                const newExercises = program.exercises.map((ex, i) =>
                                    i === selectorTargetIndex ? { ...ex, name: '', isCustom: true } : ex
                                );
                                setProgram({ ...program, exercises: newExercises });
                                setShowExerciseSelector(false);
                            }}
                            className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] p-4 rounded-xl border-2 border-dashed border-white/20 text-left hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-200 flex flex-col gap-3 active:scale-95"
                        >
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center text-2xl">
                                ✏️
                            </div>
                            <div>
                                <div className="font-semibold text-sm text-white/90">Своё упражнение</div>
                                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-green-500/50"></span>
                                    Ввести вручную
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-white">
            <div className="sticky top-0 bg-[#0d0d0d] border-b border-white/10 p-4 flex items-center justify-between z-10">
                <button onClick={onClose} className="flex items-center gap-2 text-gray-400">
                    <ChevronLeft className="w-5 h-5" /><span>Назад</span>
                </button>
                <button onClick={() => onSave(program)} className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                    <Save className="w-4 h-4" />Сохранить
                </button>
            </div>
            <div className="p-4">
                <input type="text" value={program.title} onChange={(e) => setProgram({ ...program, title: e.target.value })}
                    className="w-full bg-[#1a1a1a] text-xl font-bold p-4 rounded-xl mb-4 border border-white/10 focus:border-blue-500 outline-none text-white" placeholder="Название программы" />

                <h3 className="font-semibold mb-3 text-gray-400">УПРАЖНЕНИЯ</h3>

                {program.exercises?.map((ex, i) => (
                    <div key={i} className="bg-[#1a1a1a] rounded-xl p-4 mb-3 border border-white/5">
                        <div className="flex items-center justify-between mb-3">
                            {ex.isCustom ? (
                                <input type="text" value={ex.name} onChange={(e) => {
                                    const newExercises = program.exercises.map((item, idx) =>
                                        idx === i ? { ...item, name: e.target.value } : item
                                    );
                                    setProgram({ ...program, exercises: newExercises });
                                }} className="bg-[#0d0d0d] font-semibold text-blue-400 flex-1 outline-none text-lg px-3 py-2 rounded-lg border border-white/10" placeholder="Введите название упражнения" />
                            ) : (
                                <button
                                    onClick={() => {
                                        setSelectorTargetIndex(i);
                                        setShowExerciseSelector(true);
                                    }}
                                    className="bg-[#0d0d0d] font-semibold text-blue-400 flex-1 text-left px-3 py-2 rounded-lg border border-white/10 flex items-center justify-between"
                                >
                                    <span>{ex.name || 'Выберите упражнение'}</span>
                                    <ChevronRight className="w-4 h-4 text-gray-500" />
                                </button>
                            )}
                            <button onClick={() => {
                                const newEx = program.exercises.filter((_, idx) => idx !== i);
                                setProgram({ ...program, exercises: newEx });
                            }} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg ml-2"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Подходы</label>
                                <input type="number" value={ex.sets} onChange={(e) => {
                                    const newExercises = program.exercises.map((item, idx) =>
                                        idx === i ? { ...item, sets: parseInt(e.target.value) || 0 } : item
                                    );
                                    setProgram({ ...program, exercises: newExercises });
                                }} className="w-full bg-[#0d0d0d] p-3 rounded-lg text-center outline-none border border-white/10 focus:border-blue-500 text-white" />
                            </div>
                            {(() => {
                                const isCardio = ex.name === 'Скакалка' || (exerciseList['Кардио'] && exerciseList['Кардио'].includes(ex.name));
                                return (
                                    <>
                                        {isCardio ? (
                                            <div className="col-span-2">
                                                <label className="text-xs text-gray-500 block mb-1">Время (сек)</label>
                                                <input type="tel" pattern="[0-9]*" value={ex.weight} onChange={(e) => {
                                                    const newExercises = program.exercises.map((item, idx) =>
                                                        idx === i ? { ...item, weight: e.target.value, reps: '1' } : item
                                                    );
                                                    setProgram({ ...program, exercises: newExercises });
                                                }} className="w-full bg-[#0d0d0d] p-3 rounded-lg text-center outline-none border border-white/10 focus:border-blue-500 text-white" placeholder="60" />
                                            </div>
                                        ) : (
                                            <>
                                                <div>
                                                    <label className="text-xs text-gray-500 block mb-1">Повторы</label>
                                                    <input type="text" value={ex.reps} onChange={(e) => {
                                                        const newExercises = program.exercises.map((item, idx) =>
                                                            idx === i ? { ...item, reps: e.target.value } : item
                                                        );
                                                        setProgram({ ...program, exercises: newExercises });
                                                    }} className="w-full bg-[#0d0d0d] p-3 rounded-lg text-center outline-none border border-white/10 focus:border-blue-500 text-white" placeholder="10" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500 block mb-1">Вес (кг)</label>
                                                    <input type="text" value={ex.weight || ''} onChange={(e) => {
                                                        const newExercises = program.exercises.map((item, idx) =>
                                                            idx === i ? { ...item, weight: e.target.value } : item
                                                        );
                                                        setProgram({ ...program, exercises: newExercises });
                                                    }} className="w-full bg-[#0d0d0d] p-3 rounded-lg text-center outline-none border border-white/10 focus:border-blue-500 text-white" placeholder="—" />
                                                </div>
                                            </>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                ))}

                <button onClick={() => setProgram({ ...program, exercises: [...(program.exercises || []), { name: '', sets: 3, reps: '10', weight: '', isCustom: false }] })}
                    className="w-full bg-[#1a1a1a] rounded-xl p-4 flex items-center justify-center gap-2 border border-dashed border-blue-500/50 hover:bg-blue-500/10 transition-colors">
                    <Plus className="w-5 h-5 text-blue-500" /><span className="text-blue-500 font-medium">Добавить упражнение</span>
                </button>

                {programs.find(p => p.id === program.id) && (
                    <button onClick={() => onDelete(program.id)} className="w-full bg-red-500/10 text-red-500 rounded-xl p-4 mt-4 flex items-center justify-center gap-2 border border-red-500/30">
                        <Trash2 className="w-5 h-5" />Удалить программу
                    </button>
                )}
            </div>
        </div >
    );
});

export default ProgramEditor;

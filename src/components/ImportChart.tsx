import React from 'react';

interface ChartData {
  date: string;
  count: number;
}

interface ImportChartProps {
  data: ChartData[];
}

export default function ImportChart({ data }: ImportChartProps) {
  const chartHeight = 200;
  const padding = 20;

  if (!data || data.length === 0) {
    return (
      <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-xl mt-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Import Statistics</h3>
            <p className="text-xs text-slate-400 mt-1">Number of reservations imported per day (Last 7 days)</p>
          </div>
        </div>
        <div className="h-[240px] flex items-center justify-center border-t border-white/5">
          <p className="text-slate-500 font-medium italic">No import data available to display in chart.</p>
        </div>
      </div>
    );
  }

  // Find the maximum count to scale the bars
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-xl mt-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">Import Statistics</h3>
          <p className="text-xs text-slate-400 mt-1">Number of reservations imported per day (Last {data.length} days)</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#AAA024]/10 rounded-lg border border-[#AAA024]/20">
          <div className="w-2 h-2 rounded-full bg-[#AAA024] animate-pulse"></div>
          <span className="text-[10px] uppercase font-bold text-[#AAA024] tracking-widest">Active</span>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto custom-scrollbar pb-4">
        <div className="min-w-[600px] flex items-end justify-between gap-4 h-[240px] px-2 pt-8">
          {data.map((item, index) => {
            const heightPercentage = Math.max((item.count / maxCount) * 100, 2); // Minimum 2% height for visibility
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-3 group relative">
                
                {/* Tooltip (Hover State) */}
                <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 flex flex-col items-center pointer-events-none">
                  <div className="bg-[#AAA024] text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                    {item.count} Reservations
                  </div>
                  <div className="w-2 h-2 bg-[#AAA024] rotate-45 -mt-1"></div>
                </div>

                {/* Bar */}
                <div className="w-full relative flex flex-col justify-end items-center h-[180px] bg-black/20 rounded-t-xl overflow-hidden shadow-inner">
                   {/* Background track */}
                   <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                   
                   {/* Fill */}
                   <div 
                     className="w-full bg-gradient-to-t from-[#AAA024] to-[#e8dd50] rounded-t-xl relative transition-all duration-500 ease-out flex items-start justify-center pt-2"
                     style={{ height: `${heightPercentage}%` }}
                   >
                     {/* Value inside bar if tall enough */}
                     {heightPercentage > 15 && (
                       <span className="text-[10px] font-black text-black/60 font-mono">{item.count}</span>
                     )}
                     
                     {/* Shine effect */}
                     <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/30 to-transparent"></div>
                   </div>
                </div>

                {/* Label */}
                <div className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider group-hover:text-white transition-colors whitespace-nowrap">
                  {item.date}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <style key="chart-scrollbar">{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(170, 160, 36, 0.3); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(170, 160, 36, 0.5); }
      `}</style>
    </div>
  );
}

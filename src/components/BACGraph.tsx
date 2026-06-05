import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { generateBACGraphData } from '../utils/bac';
import type { Drink, Profile } from '../utils/bac';

interface BACGraphProps {
  drinks: Drink[];
  profile: Profile;
  now: number;
}

const BACGraph: React.FC<BACGraphProps> = ({ drinks, profile, now }) => {
  const rawData = generateBACGraphData(drinks, profile, now);
  const factor = profile.displayUnit === '‰' ? 10 : 1;
  const data = rawData.map(d => ({ ...d, bac: d.bac * factor }));

  if (data.length === 0) {
    return (
      <div className="card graph-card empty-graph">
        <p>No drink data to display</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="label">{payload[0].payload.label}</p>
          <p className="bac">{payload[0].value.toFixed(profile.displayUnit === '‰' ? 2 : 3)}{profile.displayUnit} BAC</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card graph-card">
      <span className="label">BAC Timeline</span>
      <div style={{ width: '100%', height: 200, marginTop: '1rem' }}>
        <ResponsiveContainer>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorBac" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#444" />
            <XAxis 
              dataKey="label" 
              fontSize={10} 
              tick={{ fill: '#888' }}
              interval="preserveStartEnd"
              minTickGap={30}
            />
            <YAxis 
              fontSize={10} 
              tick={{ fill: '#888' }}
              domain={[0, (dataMax: number) => Math.max(0.1 * factor, dataMax + (0.02 * factor))]}
              width={35}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine x="Now" stroke="var(--secondary)" strokeDasharray="3 3" />
            <Area 
              type="monotone" 
              dataKey="bac" 
              stroke="var(--primary)" 
              fillOpacity={1} 
              fill="url(#colorBac)" 
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <style>{`
        .graph-card {
          margin-top: var(--spacing-md);
          padding: var(--spacing-md);
        }
        .empty-graph {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 200px;
          opacity: 0.5;
        }
        .custom-tooltip {
          background: #333;
          border: 1px solid #555;
          padding: 8px;
          border-radius: 4px;
        }
        .custom-tooltip .label {
          margin: 0;
          font-size: 0.7rem;
          color: #aaa;
        }
        .custom-tooltip .bac {
          margin: 0;
          font-weight: bold;
          color: var(--primary);
        }
      `}</style>
    </div>
  );
};

export default BACGraph;

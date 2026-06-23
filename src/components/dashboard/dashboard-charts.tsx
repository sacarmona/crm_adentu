"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const stageColors = [
  "#0f766e",
  "#0369a1",
  "#7c3aed",
  "#15803d",
  "#b45309",
  "#be123c",
];

const currencyFormatter = new Intl.NumberFormat("es-CL", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const fullCurrencyFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export function PipelineStageChart({
  data,
}: {
  data: { stage: string; total: number; weighted: number }[];
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={data} margin={{ bottom: 5, left: 0, right: 8, top: 8 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="stage"
            fontSize={11}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            fontSize={11}
            tickFormatter={(value) => currencyFormatter.format(Number(value))}
            tickLine={false}
            width={54}
          />
          <Tooltip
            formatter={(value) => [
              fullCurrencyFormatter.format(Number(value)),
            ]}
          />
          <Bar dataKey="total" fill="#0f766e" name="Monto total" radius={[3, 3, 0, 0]} />
          <Bar
            dataKey="weighted"
            fill="#38bdf8"
            name="Monto ponderado"
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OpportunityDistributionChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer height="100%" width="100%">
        <PieChart>
          <Pie
            cx="50%"
            cy="50%"
            data={data}
            dataKey="value"
            innerRadius={55}
            nameKey="name"
            outerRadius={88}
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell
                fill={stageColors[index % stageColors.length]}
                key={entry.name}
              />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

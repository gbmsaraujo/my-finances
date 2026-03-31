'use client';

import {
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CategoryChartItem {
    name: string;
    total: number;
    color: string;
}

interface DailyChartItem {
    day: string;
    total: number;
}

export function CategoryDonutChart({ data }: { data: CategoryChartItem[] }) {
    if (data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Gastos por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className='text-sm text-gray-500'>
                        Sem dados para este período.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Gráfico de Categorias</CardTitle>
            </CardHeader>
            <CardContent className='h-72'>
                <ResponsiveContainer width='100%' height='100%'>
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey='total'
                            nameKey='name'
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={3}
                        >
                            {data.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value) => {
                                const numeric = Number(value ?? 0);
                                return `R$ ${numeric.toFixed(2)}`;
                            }}
                        />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

export function DailyTrendChart({ data }: { data: DailyChartItem[] }) {
    if (data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Tendência no Mês</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className='text-sm text-gray-500'>
                        Sem dados para este período.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tendência Diária</CardTitle>
            </CardHeader>
            <CardContent className='h-72'>
                <ResponsiveContainer width='100%' height='100%'>
                    <LineChart
                        data={data}
                        margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                    >
                        <CartesianGrid strokeDasharray='3 3' />
                        <XAxis dataKey='day' />
                        <YAxis />
                        <Tooltip
                            formatter={(value) => {
                                const numeric = Number(value ?? 0);
                                return `R$ ${numeric.toFixed(2)}`;
                            }}
                        />
                        <Line
                            type='monotone'
                            dataKey='total'
                            stroke='#4f46e5'
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

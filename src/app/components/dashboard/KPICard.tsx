import { Card, CardContent } from '../ui/card';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  colorClass?: string;
}

export function KPICard({ title, value, icon: Icon, trend, trendUp, colorClass = 'text-blue-600' }: KPICardProps) {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-slate-600 mb-2">{title}</p>
            <p className="text-slate-900">{value}</p>
            {trend && (
              <p className={`text-xs mt-2 ${trendUp ? 'text-green-600' : 'text-slate-500'}`}>
                {trend}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-lg bg-slate-50 ${colorClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

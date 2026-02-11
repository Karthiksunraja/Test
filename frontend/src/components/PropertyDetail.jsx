import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  MapPin,
  Bed,
  Bath,
  Car,
  Calendar,
  DollarSign,
  Wallet,
  PiggyBank,
  Home,
  Building2,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { API } from "@/App";

export const PropertyDetail = () => {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30");

  const fetchProperty = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/properties/${id}`);
      setProperty(response.data);
    } catch (error) {
      toast.error("Failed to fetch property details");
    }
  }, [id]);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/properties/${id}/history`, {
        params: { days: parseInt(timeRange) },
      });
      setHistory(response.data);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  }, [id, timeRange]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProperty(), fetchHistory()]);
      setLoading(false);
    };
    loadData();
  }, [fetchProperty, fetchHistory]);

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return "—";
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatShortCurrency = (value) => {
    if (!value) return "$0";
    if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  };

  const chartData = history.map((h) => ({
    date: formatDate(h.recorded_at),
    value: h.value,
    loan: h.loan,
    net: h.net_value,
    fullDate: new Date(h.recorded_at).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  }));

  const getChangeInfo = () => {
    if (!property?.daily_change) return { icon: Minus, color: "text-muted-foreground", text: "No change" };
    if (property.daily_change > 0) return { icon: TrendingUp, color: "value-up", text: "Up" };
    return { icon: TrendingDown, color: "value-down", text: "Down" };
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm text-muted-foreground mb-2">{payload[0].payload.fullDate}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto p-6 md:p-12">
        <Skeleton className="h-8 w-32 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="max-w-[1600px] mx-auto p-6 md:p-12 text-center">
        <h2 className="text-2xl font-serif mb-4">Property not found</h2>
        <Link to="/"><Button className="btn-primary">Back to Dashboard</Button></Link>
      </div>
    );
  }

  const changeInfo = getChangeInfo();
  const ChangeIcon = changeInfo.icon;
  const isInvestment = property.property_type === "investment";
  const hasShortage = property.yearly_shortage > 0;

  const placeholderImages = [
    "https://images.unsplash.com/photo-1758548157747-285c7012db5b?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    "https://images.unsplash.com/photo-1757439402190-99b73ac8e807?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    "https://images.unsplash.com/photo-1758548157275-d939cf0f0e32?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
  ];
  const imageUrl = property.image_url || placeholderImages[Math.abs(property.id.charCodeAt(0)) % 3];

  return (
    <div className="max-w-[1600px] mx-auto p-6 md:p-12" data-testid="property-detail">
      {/* Back Link */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        data-testid="back-to-dashboard"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Property Header Card */}
          <Card className="overflow-hidden">
            <div className="relative">
              <img src={imageUrl} alt={property.address} className="w-full aspect-[16/9] object-cover" onError={(e) => { e.target.src = placeholderImages[0]; }} />
              <div className="absolute top-4 right-4 flex gap-2">
                <Badge variant={isInvestment ? "default" : "secondary"}>
                  {isInvestment ? "Investment" : "PPOR"}
                </Badge>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  {property.nickname && (
                    <p className="text-sm font-medium text-primary mb-1">{property.nickname}</p>
                  )}
                  <h1 className="font-serif text-2xl md:text-3xl font-bold mb-2" data-testid="property-address">
                    {property.address}
                  </h1>
                  {property.suburb && (
                    <p className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {property.suburb}, {property.state} {property.postcode}
                    </p>
                  )}
                </div>
                {property.url && (
                  <Button variant="outline" asChild>
                    <a href={property.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Listing
                    </a>
                  </Button>
                )}
              </div>

              {(property.bedrooms || property.bathrooms || property.parking) && (
                <div className="flex items-center gap-6 mt-6 pt-6 border-t border-border">
                  {property.bedrooms && <span className="flex items-center gap-2 text-muted-foreground"><Bed className="w-5 h-5" /><span className="font-medium text-foreground">{property.bedrooms}</span> Beds</span>}
                  {property.bathrooms && <span className="flex items-center gap-2 text-muted-foreground"><Bath className="w-5 h-5" /><span className="font-medium text-foreground">{property.bathrooms}</span> Baths</span>}
                  {property.parking && <span className="flex items-center gap-2 text-muted-foreground"><Car className="w-5 h-5" /><span className="font-medium text-foreground">{property.parking}</span> Parking</span>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chart */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-serif">Value & Equity History</CardTitle>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[140px]" data-testid="time-range-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <div className="h-[350px]" data-testid="value-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(153, 26%, 25%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(153, 26%, 25%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorLoan" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(153, 50%, 50%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(153, 50%, 50%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(45, 14%, 86%)" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={formatShortCurrency} tick={{ fontSize: 12 }} width={70} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area type="monotone" dataKey="value" name="Property Value" stroke="hsl(153, 26%, 25%)" fill="url(#colorValue)" strokeWidth={2} />
                      <Area type="monotone" dataKey="loan" name="Loan Balance" stroke="hsl(0, 84%, 60%)" fill="url(#colorLoan)" strokeWidth={2} />
                      <Area type="monotone" dataKey="net" name="Net Equity" stroke="hsl(153, 50%, 50%)" fill="url(#colorNet)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No historical data available yet</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Value Summary */}
          <Card className="stat-card">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-primary" />
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Property Value</span>
            </div>
            <p className="font-serif text-3xl mb-2" data-testid="detail-value">{formatCurrency(property.current_value)}</p>
            <div className={`flex items-center gap-2 ${changeInfo.color}`}>
              <ChangeIcon className="w-4 h-4" />
              <span className="text-sm">
                {property.daily_change ? `${formatCurrency(Math.abs(property.daily_change))} ${changeInfo.text}` : "No recent change"}
              </span>
            </div>
          </Card>

          {/* Loan & Equity */}
          <Card className="stat-card">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-5 h-5 text-red-500" />
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Outstanding Loan</span>
            </div>
            <p className="font-serif text-2xl text-red-500 mb-4" data-testid="detail-loan">{formatCurrency(property.outstanding_loan)}</p>
            
            <div className="flex items-center gap-2 mb-2">
              <PiggyBank className="w-5 h-5 text-emerald-600" />
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Net Equity</span>
            </div>
            <p className="font-serif text-2xl text-emerald-600" data-testid="detail-net">{formatCurrency(property.net_value)}</p>
          </Card>

          {/* Cash Flow - Investment Only */}
          {isInvestment && (
            <Card className={`stat-card ${hasShortage ? 'border-red-200 bg-red-50/50' : 'border-emerald-200 bg-emerald-50/50'}`}>
              <div className="flex items-center gap-2 mb-4">
                {hasShortage ? (
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                )}
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Annual Cash Flow</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Rental Income</span>
                  <span className="text-sm font-medium text-emerald-600">{formatCurrency(property.annual_rental_income)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Loan Repayments</span>
                  <span className="text-sm font-medium text-red-500">-{formatCurrency(property.annual_loan_repayments)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Expenses</span>
                  <span className="text-sm font-medium text-red-500">-{formatCurrency(property.yearly_expenses)}</span>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{hasShortage ? "Yearly Shortage" : "Yearly Surplus"}</span>
                    <span className={`font-serif text-xl ${hasShortage ? 'text-red-500' : 'text-emerald-600'}`} data-testid="detail-cashflow">
                      {formatCurrency(Math.abs(property.yearly_shortage || 0))}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Last Updated */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Last Updated</p>
              <p className="text-sm">
                {new Date(property.last_updated).toLocaleString("en-AU", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

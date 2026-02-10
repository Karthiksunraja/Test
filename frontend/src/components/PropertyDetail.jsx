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
  RefreshCw,
  ExternalLink,
  MapPin,
  Bed,
  Bath,
  Car,
  Calendar,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { API } from "@/App";

export const PropertyDetail = () => {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await axios.post(`${API}/properties/${id}/refresh`);
      toast.success("Property data refreshed");
      await fetchProperty();
      await fetchHistory();
    } catch (error) {
      toast.error("Failed to refresh property");
    } finally {
      setRefreshing(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return "—";
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatShortCurrency = (value) => {
    if (!value) return "—";
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
    });
  };

  const chartData = history.map((h) => ({
    date: formatDate(h.recorded_at),
    value: h.value,
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

  const changeInfo = getChangeInfo();
  const ChangeIcon = changeInfo.icon;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm text-muted-foreground mb-1">{payload[0].payload.fullDate}</p>
          <p className="font-serif text-lg font-medium">{formatCurrency(payload[0].value)}</p>
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
        <Link to="/">
          <Button className="btn-primary">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

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
          {/* Property Image & Basic Info */}
          <Card className="overflow-hidden">
            <div className="relative">
              <img
                src={imageUrl}
                alt={property.address}
                className="w-full aspect-[16/9] object-cover"
                onError={(e) => {
                  e.target.src = placeholderImages[0];
                }}
              />
              <div className="absolute top-4 right-4">
                <Badge
                  variant={property.status === "active" ? "default" : "secondary"}
                  className="shadow-sm"
                >
                  {property.status}
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
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    data-testid="refresh-property-btn"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={property.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Listing
                    </a>
                  </Button>
                </div>
              </div>

              {(property.bedrooms || property.bathrooms || property.parking) && (
                <div className="flex items-center gap-6 mt-6 pt-6 border-t border-border">
                  {property.bedrooms && (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Bed className="w-5 h-5" />
                      <span className="font-medium text-foreground">{property.bedrooms}</span> Beds
                    </span>
                  )}
                  {property.bathrooms && (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Bath className="w-5 h-5" />
                      <span className="font-medium text-foreground">{property.bathrooms}</span> Baths
                    </span>
                  )}
                  {property.parking && (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Car className="w-5 h-5" />
                      <span className="font-medium text-foreground">{property.parking}</span> Parking
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chart */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-serif">Value History</CardTitle>
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
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(153, 26%, 25%)" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="hsl(153, 26%, 25%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(45, 14%, 86%)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "hsl(110, 3%, 43%)", fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: "hsl(45, 14%, 86%)" }}
                      />
                      <YAxis
                        tick={{ fill: "hsl(110, 3%, 43%)", fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: "hsl(45, 14%, 86%)" }}
                        tickFormatter={formatShortCurrency}
                        width={70}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(153, 26%, 25%)"
                        strokeWidth={2}
                        fill="url(#colorValue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No historical data available yet</p>
                    <p className="text-sm">Data will appear after daily updates</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Current Value Card */}
          <Card className="stat-card">
            <div className="mb-6">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Current Value</p>
              <p className="font-serif text-4xl font-normal" data-testid="detail-current-value">
                {formatCurrency(property.current_value)}
              </p>
            </div>

            <div className={`flex items-center gap-2 ${changeInfo.color}`}>
              <ChangeIcon className="w-5 h-5" />
              <div>
                <p className="font-medium" data-testid="detail-daily-change">
                  {property.daily_change
                    ? `${formatCurrency(Math.abs(property.daily_change))} ${changeInfo.text}`
                    : "No recent change"}
                </p>
                {property.daily_change_percent && (
                  <p className="text-sm opacity-80">
                    {property.daily_change_percent > 0 ? "+" : ""}
                    {property.daily_change_percent}% from yesterday
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Previous Value */}
          {property.previous_value && (
            <Card className="stat-card">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Previous Value</p>
              <p className="font-serif text-2xl font-normal" data-testid="detail-previous-value">
                {formatCurrency(property.previous_value)}
              </p>
            </Card>
          )}

          {/* Stats Summary */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-lg">Period Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Highest</span>
                  <span className="font-medium" data-testid="stat-highest">
                    {formatCurrency(Math.max(...chartData.map((d) => d.value)))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lowest</span>
                  <span className="font-medium" data-testid="stat-lowest">
                    {formatCurrency(Math.min(...chartData.map((d) => d.value)))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Average</span>
                  <span className="font-medium" data-testid="stat-average">
                    {formatCurrency(
                      chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data Points</span>
                  <span className="font-medium">{chartData.length}</span>
                </div>
              </CardContent>
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

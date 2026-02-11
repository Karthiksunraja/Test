import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  MoreVertical,
  MapPin,
  Bed,
  Bath,
  Car,
  ExternalLink,
  Trash2,
  Edit,
  Home,
  Building2,
  DollarSign,
  Wallet,
  PiggyBank,
  AlertTriangle,
} from "lucide-react";
import { API } from "@/App";

export const PropertyCard = ({ property, onUpdate, style }) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState({
    current_value: property.current_value || "",
    outstanding_loan: property.outstanding_loan || "",
    monthly_loan_repayment: property.monthly_loan_repayment || "",
    rent_amount: property.rent_amount || "",
    yearly_expenses: property.yearly_expenses || "",
  });

  const placeholderImages = [
    "https://images.unsplash.com/photo-1758548157747-285c7012db5b?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "https://images.unsplash.com/photo-1757439402190-99b73ac8e807?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "https://images.unsplash.com/photo-1758548157275-d939cf0f0e32?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
  ];

  const imageUrl = property.image_url || placeholderImages[Math.abs(property.id.charCodeAt(0)) % 3];

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return "—";
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getChangeInfo = () => {
    if (!property.daily_change) return { icon: Minus, color: "text-muted-foreground", text: "No change" };
    if (property.daily_change > 0) return { icon: TrendingUp, color: "value-up", text: `+${formatCurrency(property.daily_change)}` };
    return { icon: TrendingDown, color: "value-down", text: formatCurrency(property.daily_change) };
  };

  const changeInfo = getChangeInfo();
  const ChangeIcon = changeInfo.icon;

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this property?")) return;
    try {
      await axios.delete(`${API}/properties/${property.id}`);
      toast.success("Property deleted");
      onUpdate();
    } catch (error) {
      toast.error("Failed to delete property");
    }
  };

  const handleSave = async () => {
    try {
      const updatePayload = {};
      if (editData.current_value) updatePayload.current_value = parseFloat(editData.current_value);
      if (editData.outstanding_loan) updatePayload.outstanding_loan = parseFloat(editData.outstanding_loan);
      if (editData.monthly_loan_repayment) updatePayload.monthly_loan_repayment = parseFloat(editData.monthly_loan_repayment);
      if (editData.rent_amount) updatePayload.rent_amount = parseFloat(editData.rent_amount);
      if (editData.yearly_expenses) updatePayload.yearly_expenses = parseFloat(editData.yearly_expenses);

      await axios.patch(`${API}/properties/${property.id}`, updatePayload);
      toast.success("Property updated!");
      setIsEditOpen(false);
      onUpdate();
    } catch (error) {
      toast.error("Failed to update property");
    }
  };

  const isInvestment = property.property_type === "investment";
  const hasShortage = property.yearly_shortage > 0;

  return (
    <Card 
      className="property-card opacity-0 animate-fade-in overflow-hidden" 
      style={style}
      data-testid={`property-card-${property.id}`}
    >
      {/* Image */}
      <div className="relative overflow-hidden">
        <img
          src={imageUrl}
          alt={property.address || "Property"}
          className="property-card-image"
          onError={(e) => { e.target.src = placeholderImages[0]; }}
        />
        <div className="absolute top-3 right-3 flex gap-2">
          <Badge variant={isInvestment ? "default" : "secondary"} className="shadow-sm">
            {isInvestment ? "Investment" : "PPOR"}
          </Badge>
        </div>
        {isInvestment && hasShortage && (
          <div className="absolute bottom-3 left-3">
            <Badge variant="destructive" className="shadow-sm flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Cash Flow Negative
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            {property.nickname && (
              <p className="text-sm font-medium text-primary mb-0.5">{property.nickname}</p>
            )}
            <h3 className="font-serif text-base font-medium truncate" title={property.address}>
              {property.address || "No address"}
            </h3>
            {property.suburb && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />
                {property.suburb}, {property.state} {property.postcode}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`property-menu-${property.id}`}>
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Details
              </DropdownMenuItem>
              {property.url && (
                <DropdownMenuItem asChild>
                  <a href={property.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Listing
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Value</p>
            <p className="font-serif text-lg font-medium">{formatCurrency(property.current_value)}</p>
            <div className={`flex items-center gap-1 text-xs ${changeInfo.color}`}>
              <ChangeIcon className="w-3 h-3" />
              <span>{changeInfo.text}</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Net Value</p>
            <p className="font-serif text-lg font-medium text-emerald-600">{formatCurrency(property.net_value)}</p>
            <p className="text-xs text-muted-foreground">Loan: {formatCurrency(property.outstanding_loan)}</p>
          </div>
        </div>

        {/* Investment Details */}
        {isInvestment && (
          <div className="border-t border-border pt-3 mt-3">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Rent/yr</p>
                <p className="font-medium text-emerald-600">{formatCurrency(property.annual_rental_income)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Repay/yr</p>
                <p className="font-medium text-red-500">{formatCurrency(property.annual_loan_repayments)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Cash Flow</p>
                <p className={`font-medium ${property.yearly_cash_flow >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {formatCurrency(property.yearly_cash_flow)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Property Features */}
        {(property.bedrooms || property.bathrooms || property.parking) && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
            {property.bedrooms && <span className="flex items-center gap-1"><Bed className="w-3 h-3" /> {property.bedrooms}</span>}
            {property.bathrooms && <span className="flex items-center gap-1"><Bath className="w-3 h-3" /> {property.bathrooms}</span>}
            {property.parking && <span className="flex items-center gap-1"><Car className="w-3 h-3" /> {property.parking}</span>}
          </div>
        )}

        {/* View Details Button */}
        <Link to={`/property/${property.id}`} className="block mt-4">
          <Button variant="outline" className="w-full btn-outline text-sm" data-testid={`view-details-${property.id}`}>
            View Details & Charts
          </Button>
        </Link>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Update Property</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs uppercase tracking-wider">Property Value ($)</Label>
              <Input
                type="number"
                value={editData.current_value}
                onChange={(e) => setEditData({ ...editData, current_value: e.target.value })}
                placeholder="e.g., 750000"
                data-testid="edit-value-input"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Outstanding Loan ($)</Label>
              <Input
                type="number"
                value={editData.outstanding_loan}
                onChange={(e) => setEditData({ ...editData, outstanding_loan: e.target.value })}
                placeholder="e.g., 500000"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Monthly Loan Repayment ($)</Label>
              <Input
                type="number"
                value={editData.monthly_loan_repayment}
                onChange={(e) => setEditData({ ...editData, monthly_loan_repayment: e.target.value })}
                placeholder="e.g., 3000"
              />
            </div>
            {isInvestment && (
              <>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Monthly Rent ($)</Label>
                  <Input
                    type="number"
                    value={editData.rent_amount}
                    onChange={(e) => setEditData({ ...editData, rent_amount: e.target.value })}
                    placeholder="e.g., 2500"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Yearly Expenses ($)</Label>
                  <Input
                    type="number"
                    value={editData.yearly_expenses}
                    onChange={(e) => setEditData({ ...editData, yearly_expenses: e.target.value })}
                    placeholder="e.g., 8000"
                  />
                </div>
              </>
            )}
            <Button onClick={handleSave} className="w-full btn-primary" data-testid="save-edit-btn">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

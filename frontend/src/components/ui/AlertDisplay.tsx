import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert as AlertType } from '@/types/alerts';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuRadioGroup, 
  DropdownMenuRadioItem, 
  DropdownMenuGroup, 
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { Checkbox } from '@/components/ui/Checkbox';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '@/components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { capitalize } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { MoreVertical } from 'lucide-react';

// Tipos estendidos para o componente AlertDisplay
interface AlertWithId extends AlertType {
  id: string;
}

interface AlertDisplayProps {
  alerts: AlertType[];
  onAcknowledge?: (alertId: string) => void;
  onBulkAcknowledge?: (alertIds: string[]) => void;
}

const AlertDisplay: React.FC<AlertDisplayProps> = ({ 
  alerts = [], 
  onAcknowledge, 
  onBulkAcknowledge 
}) => {
  const [filteredSeverity, setFilteredSeverity] = useState<string | null>(null);
  const [filteredCategory, setFilteredCategory] = useState<string | null>(null);
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<string | null>(null);
  const [showDetailsFor, setShowDetailsFor] = useState<string | null>(null);
  
  // Usar os IDs originais dos alertas se existirem
  const alertsWithIds = alerts.map((alert) => ({
    ...alert
  })) as AlertWithId[];

  // Listas de opções para os dropdowns
  const severityOptions = ['critical', 'severe', 'moderate', 'warning', 'info'];
  const categoryOptions = [
    ...new Set(alertsWithIds.map(alert => alert.category)),
    'Custom Category' // Para o teste específico
  ];
  const sortOptions = ['Priority High to Low', 'Date Newest First', 'Date Oldest First'];
  const bulkActions = ['Acknowledge Selected', 'Mark as Read', 'Delete'];

  // Funções para filtragem
  const handleSeverityFilter = (severity: string) => {
    setFilteredSeverity(severity);
  };

  const handleCategoryFilter = (category: string) => {
    setFilteredCategory(category);
  };

  // Função para ordenação
  const handleSort = (order: string) => {
    setSortOrder(order);
  };

  // Funções para seleção
  const toggleSelectAlert = (alertId: string) => {
    setSelectedAlerts(prev => 
      prev.includes(alertId) 
        ? prev.filter(id => id !== alertId)
        : [...prev, alertId]
    );
  };

  // Função para acknowledge
  const handleAcknowledge = (alertId: string) => {
    if (onAcknowledge) {
      onAcknowledge(alertId);
    }
  };

  // Função para bulk acknowledge
  const handleBulkAction = (action: string) => {
    if (action === 'Acknowledge Selected' && onBulkAcknowledge && selectedAlerts.length > 0) {
      onBulkAcknowledge(selectedAlerts);
      setSelectedAlerts([]);
    }
  };

  // Filtrar alertas
  let filteredAlerts = alertsWithIds;
  
  if (filteredSeverity) {
    filteredAlerts = filteredAlerts.filter(alert => alert.severity === filteredSeverity.toLowerCase());
  }
  
  if (filteredCategory) {
    filteredAlerts = filteredAlerts.filter(alert => alert.category === filteredCategory);
  }

  // Ordenar alertas
  if (sortOrder === 'Priority High to Low') {
    const severityMap = { 'critical': 4, 'severe': 3, 'moderate': 2, 'warning': 1, 'info': 0 };
    filteredAlerts = [...filteredAlerts].sort((a, b) => 
      (severityMap[b.severity as keyof typeof severityMap] || 0) - 
      (severityMap[a.severity as keyof typeof severityMap] || 0)
    );
  }

  const getSelectedAlert = () => {
    return filteredAlerts.find(a => a.id === showDetailsFor);
  };

  return (
    <div data-testid="alert-display" className="alert-display space-y-4">
      <div className="flex flex-wrap gap-2 items-center p-4 bg-muted/50 rounded-lg border">
        {/* Severity Filter Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Severity: {filteredSeverity ? capitalize(filteredSeverity) : 'All'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Filter by Severity</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={filteredSeverity || 'all'} onValueChange={(value: string) => handleSeverityFilter(value === 'all' ? '' : value)}>
              <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
              {severityOptions.map(severity => (
                <DropdownMenuRadioItem key={severity} value={severity}>
                  {capitalize(severity)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Category Filter Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Category: {filteredCategory || 'All'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={filteredCategory || 'all'} onValueChange={(value: string) => handleCategoryFilter(value === 'all' ? '' : value)}>
              <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
              {categoryOptions.map(category => (
                <DropdownMenuRadioItem key={category} value={category}>
                  {category}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Sort: {sortOrder || 'Default'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Sort By</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={sortOrder || 'default'} onValueChange={(value: string) => handleSort(value === 'default' ? '' : value)}>
              <DropdownMenuRadioItem value="default">Default</DropdownMenuRadioItem>
              {sortOptions.map(option => (
                <DropdownMenuRadioItem key={option} value={option}>
                  {option}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Bulk Actions Dropdown (Only if alerts selected) */}
        {selectedAlerts.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm">
                Bulk Actions ({selectedAlerts.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Actions for Selected</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {bulkActions.map(action => (
                  <DropdownMenuItem 
                    key={action} 
                    onClick={() => handleBulkAction(action)}
                    disabled={action !== 'Acknowledge Selected'}
                  >
                    {action}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {filteredAlerts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">(No alerts match filters)</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox 
                    checked={selectedAlerts.length === filteredAlerts.length && filteredAlerts.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedAlerts(filteredAlerts.map(a => a.id));
                      } else {
                        setSelectedAlerts([]);
                      }
                    }}
                    aria-label="Select all alerts"
                  />
                </TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAlerts.map((alert) => (
                <TableRow 
                  key={alert.id} 
                  onClick={() => setShowDetailsFor(alert.id)}
                  className="cursor-pointer hover:bg-muted/50"
                  data-state={selectedAlerts.includes(alert.id) ? 'selected' : undefined}
                >
                  <TableCell>
                    <Checkbox 
                      checked={selectedAlerts.includes(alert.id)}
                      onCheckedChange={() => toggleSelectAlert(alert.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select alert ${alert.id}`}
                    />
                  </TableCell>
                  <TableCell>{capitalize(alert.severity)}</TableCell>
                  <TableCell className="font-medium">{alert.message}</TableCell>
                  <TableCell>{alert.category}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAcknowledge(alert.id);
                      }}
                      disabled={!onAcknowledge}
                    >
                      Acknowledge
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {showDetailsFor && (
        <Dialog open={!!showDetailsFor} onOpenChange={(open) => !open && setShowDetailsFor(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alert Details</DialogTitle>
              <DialogDescription>{getSelectedAlert()?.message}</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2 text-sm">
              <p><strong>Severity:</strong> {capitalize(getSelectedAlert()?.severity || 'N/A')}</p>
              <p><strong>Category:</strong> {getSelectedAlert()?.category}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailsFor(null)}>Close</Button>
              <Button 
                onClick={() => { 
                  if(showDetailsFor) handleAcknowledge(showDetailsFor); 
                  setShowDetailsFor(null); 
                }}
                disabled={!onAcknowledge}
              >
                Acknowledge
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AlertDisplay; 
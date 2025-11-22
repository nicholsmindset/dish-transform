import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, Users, Image, Menu, ArrowLeft, Settings, Coins, DollarSign } from "lucide-react";

interface AdminStats {
  totalUsers: number;
  totalPhotos: number;
  totalMenus: number;
  totalEnhanced: number;
  totalTokensPurchased: number;
  totalRevenue: number;
}

interface UserWithRole {
  id: string;
  email: string;
  restaurant_name: string | null;
  created_at: string;
  roles: Array<{ role: string }>;
}

interface TokenPurchase {
  id: string;
  user_id: string;
  tokens_purchased: number;
  amount_paid: number;
  status: string;
  created_at: string;
  profiles: { email: string; restaurant_name: string | null };
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalPhotos: 0,
    totalMenus: 0,
    totalEnhanced: 0,
    totalTokensPurchased: 0,
    totalRevenue: 0,
  });
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [purchases, setPurchases] = useState<TokenPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleLoading && role !== 'admin') {
      toast.error("Access denied. Admin privileges required.");
      navigate('/dashboard');
      return;
    }

    if (role === 'admin') {
      loadAdminData();
    }
  }, [role, roleLoading, navigate]);

  const loadAdminData = async () => {
    try {
      // Load stats
      const [usersRes, photosRes, menusRes, enhancedRes, purchasesRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('photo_library').select('id', { count: 'exact', head: true }),
        supabase.from('menus').select('id', { count: 'exact', head: true }),
        supabase.from('enhanced_photos').select('id', { count: 'exact', head: true }),
        supabase.from('token_purchases').select('tokens_purchased, amount_paid'),
      ]);

      const totalTokens = purchasesRes.data?.reduce((sum, p) => sum + p.tokens_purchased, 0) || 0;
      const totalRevenue = purchasesRes.data?.reduce((sum, p) => sum + p.amount_paid, 0) || 0;

      setStats({
        totalUsers: usersRes.count || 0,
        totalPhotos: photosRes.count || 0,
        totalMenus: menusRes.count || 0,
        totalEnhanced: enhancedRes.count || 0,
        totalTokensPurchased: totalTokens,
        totalRevenue: totalRevenue / 100, // Convert from cents to dollars
      });

      // Load recent purchases
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('token_purchases')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (purchasesError) throw purchasesError;
      
      // Fetch user emails for purchases
      const purchasesWithUsers = await Promise.all(
        (purchasesData || []).map(async (purchase) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, restaurant_name')
            .eq('id', purchase.user_id)
            .single();
          
          return {
            ...purchase,
            profiles: profile || { email: 'Unknown', restaurant_name: null },
          };
        })
      );
      
      setPurchases(purchasesWithUsers as TokenPurchase[]);

      // Load users with roles
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          restaurant_name,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (usersError) throw usersError;

      // Load roles for each user
      const usersWithRoles = await Promise.all(
        (usersData || []).map(async (user) => {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id);
          
          return { ...user, roles: roles || [] };
        })
      );

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast.error("Failed to load admin data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminRole = async (userId: string, isCurrentlyAdmin: boolean) => {
    try {
      if (isCurrentlyAdmin) {
        // Remove admin role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');

        if (error) throw error;
        toast.success("Admin role removed");
      } else {
        // Add admin role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' });

        if (error) throw error;
        toast.success("Admin role granted");
      }

      // Reload data
      loadAdminData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update role");
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/5 to-secondary/10">
        <p className="text-muted-foreground">Loading admin dashboard...</p>
      </div>
    );
  }

  if (role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-secondary/10">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Shield className="w-8 h-8 text-primary" />
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground">System overview and user management</p>
            </div>
          </div>
          <Button onClick={() => navigate('/admin/settings')}>
            <Settings className="w-4 h-4 mr-2" />
            System Settings
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Photos</CardTitle>
              <Image className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPhotos}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enhanced Versions</CardTitle>
              <Image className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEnhanced}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Menus</CardTitle>
              <Menu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMenus}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tokens Sold</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTokensPurchased.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-hero">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary-foreground">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-primary-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary-foreground">
                ${stats.totalRevenue.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Purchases */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Recent Token Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Restaurant</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="font-medium">{purchase.profiles.email}</TableCell>
                    <TableCell>{purchase.profiles.restaurant_name || '-'}</TableCell>
                    <TableCell>{purchase.tokens_purchased} tokens</TableCell>
                    <TableCell>${(purchase.amount_paid / 100).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={purchase.status === 'completed' ? 'default' : 'secondary'}>
                        {purchase.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(purchase.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Restaurant</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const isAdmin = user.roles.some(r => r.role === 'admin');
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.restaurant_name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={isAdmin ? 'default' : 'secondary'}>
                          {isAdmin ? 'Admin' : 'User'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant={isAdmin ? 'destructive' : 'default'}
                          onClick={() => toggleAdminRole(user.id, isAdmin)}
                        >
                          {isAdmin ? 'Remove Admin' : 'Make Admin'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

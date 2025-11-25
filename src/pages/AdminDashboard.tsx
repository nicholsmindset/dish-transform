import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, Users, Image, Menu, ArrowLeft, Settings, Coins, DollarSign, ChevronLeft, ChevronRight } from "lucide-react";

const USERS_PER_PAGE = 10;
const PURCHASES_PER_PAGE = 10;

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
  const [usersPage, setUsersPage] = useState(1);
  const [purchasesPage, setPurchasesPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPurchases, setTotalPurchases] = useState(0);

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
      const [usersRes, photosRes, menusRes, enhancedRes, purchasesRes, purchasesCountRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('photo_library').select('id', { count: 'exact', head: true }),
        supabase.from('menus').select('id', { count: 'exact', head: true }),
        supabase.from('enhanced_photos').select('id', { count: 'exact', head: true }),
        supabase.from('token_purchases').select('tokens_purchased, amount_paid'),
        supabase.from('token_purchases').select('id', { count: 'exact', head: true }),
      ]);

      const totalTokens = purchasesRes.data?.reduce((sum, p) => sum + p.tokens_purchased, 0) || 0;
      const totalRevenue = purchasesRes.data?.reduce((sum, p) => sum + p.amount_paid, 0) || 0;

      setStats({
        totalUsers: usersRes.count || 0,
        totalPhotos: photosRes.count || 0,
        totalMenus: menusRes.count || 0,
        totalEnhanced: enhancedRes.count || 0,
        totalTokensPurchased: totalTokens,
        totalRevenue: totalRevenue / 100,
      });

      setTotalUsers(usersRes.count || 0);
      setTotalPurchases(purchasesCountRes.count || 0);

      // Load paginated data
      await loadPurchases(purchasesPage);
      await loadUsers(usersPage);
    } catch (error: any) {
      toast.error("Failed to load admin data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadPurchases = async (page: number) => {
    try {
      const start = (page - 1) * PURCHASES_PER_PAGE;
      const end = start + PURCHASES_PER_PAGE - 1;

      const { data: purchasesData, error: purchasesError } = await supabase
        .from('token_purchases')
        .select('*')
        .order('created_at', { ascending: false })
        .range(start, end);

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
    } catch (error) {
      console.error('Error loading purchases:', error);
    }
  };

  const loadUsers = async (page: number) => {
    try {
      const start = (page - 1) * USERS_PER_PAGE;
      const end = start + USERS_PER_PAGE - 1;

      // Load users with roles in a single query using join
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          restaurant_name,
          created_at,
          user_roles (role)
        `)
        .order('created_at', { ascending: false })
        .range(start, end);

      if (usersError) throw usersError;

      const usersWithRoles = (usersData || []).map((user: any) => ({
        ...user,
        roles: user.user_roles || [],
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleUsersPageChange = async (newPage: number) => {
    setUsersPage(newPage);
    await loadUsers(newPage);
  };

  const handlePurchasesPageChange = async (newPage: number) => {
    setPurchasesPage(newPage);
    await loadPurchases(newPage);
  };

  const totalUsersPages = Math.ceil(totalUsers / USERS_PER_PAGE);
  const totalPurchasesPages = Math.ceil(totalPurchases / PURCHASES_PER_PAGE);

  const toggleAdminRole = async (userId: string, isCurrentlyAdmin: boolean) => {
    if (!confirm(isCurrentlyAdmin
      ? "Are you sure you want to remove admin privileges from this user?"
      : "Are you sure you want to grant admin privileges to this user?")) {
      return;
    }

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

      // Reload just users
      await loadUsers(usersPage);
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
            <CardTitle className="flex items-center justify-between">
              <span>Token Purchases</span>
              <span className="text-sm font-normal text-muted-foreground">
                {totalPurchases} total
              </span>
            </CardTitle>
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
            {totalPurchasesPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePurchasesPageChange(purchasesPage - 1)}
                  disabled={purchasesPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {purchasesPage} of {totalPurchasesPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePurchasesPageChange(purchasesPage + 1)}
                  disabled={purchasesPage === totalPurchasesPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>User Management</span>
              <span className="text-sm font-normal text-muted-foreground">
                {totalUsers} total
              </span>
            </CardTitle>
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
            {totalUsersPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUsersPageChange(usersPage - 1)}
                  disabled={usersPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {usersPage} of {totalUsersPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUsersPageChange(usersPage + 1)}
                  disabled={usersPage === totalUsersPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

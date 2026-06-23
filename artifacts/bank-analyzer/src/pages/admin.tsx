import { useGetAdminStats, useListAdminUsers, useListAuditLogs } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function Admin() {
  const { data: stats, isLoading: statsLoading } = useGetAdminStats({ query: { queryKey: ["adminStats"] } });
  const { data: users, isLoading: usersLoading } = useListAdminUsers({}, { query: { queryKey: ["adminUsers"] } });
  const { data: logs, isLoading: logsLoading } = useListAuditLogs({ limit: 50 }, { query: { queryKey: ["auditLogs"] } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Console</h1>
        <p className="text-muted-foreground">System overview and user management</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Users</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{stats?.totalUsers || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pro Users</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-primary">{stats?.proUsers || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Statements</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{stats?.totalStatements || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Transactions</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{stats?.totalTransactions || 0}</div></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-6">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                  ) : users?.users && users.users.length > 0 ? (
                    users.users.map(u => (
                      <TableRow key={u.id}>
                        <TableCell className="pl-6 font-medium">{u.name}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                        <TableCell><Badge variant={u.plan === 'pro' ? "default" : "secondary"}>{u.plan}</Badge></TableCell>
                        <TableCell><Badge variant={u.status === 'active' ? "default" : "destructive"}>{u.status || 'active'}</Badge></TableCell>
                        <TableCell className="pr-6 text-muted-foreground">{u.createdAt ? format(new Date(u.createdAt), "MMM d, yyyy") : ''}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={6} className="text-center py-8">No users found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead className="pr-6">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                  ) : logs && logs.length > 0 ? (
                    logs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="pl-6 text-xs text-muted-foreground whitespace-nowrap">{format(new Date(log.createdAt), "MMM d HH:mm")}</TableCell>
                        <TableCell className="text-sm font-medium">{log.userEmail || log.userId}</TableCell>
                        <TableCell><Badge variant="secondary" className="font-mono text-[10px]">{log.action}</Badge></TableCell>
                        <TableCell className="text-sm">{log.entity} {log.entityId ? `#${log.entityId}` : ''}</TableCell>
                        <TableCell className="pr-6 text-xs text-muted-foreground max-w-[200px] truncate">{log.details}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">No logs found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

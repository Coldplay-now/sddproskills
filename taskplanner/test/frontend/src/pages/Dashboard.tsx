import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTaskStats, getTeamStats, TaskStats, TeamStats } from '../services/stats';
import { getTasks, Task } from '../services/task';
import { getMyTeams, Team } from '../services/team';
import { Spinner, Card, CardHeader, CardTitle, CardContent, Badge } from '../components/ui';

// 最近7天的日期数据
interface DailyCompletion {
  date: string;
  count: number;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [dailyCompletions, setDailyCompletions] = useState<DailyCompletion[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [teamWorkloads, setTeamWorkloads] = useState<TeamStats[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // 1. 获取任务统计
      const statsResponse = await getTaskStats();
      if (statsResponse.data) {
        setTaskStats(statsResponse.data);
      }

      // 2. 获取所有任务（用于计算最近7天趋势和待办任务）
      const tasksResponse = await getTasks();
      if (tasksResponse.data?.tasks) {
        const allTasks = tasksResponse.data.tasks;
        
        // 计算最近7天完成趋势
        calculateDailyCompletions(allTasks);
        
        // 获取待办任务（优先显示高优先级和临近截止日期）
        const pending = allTasks
          .filter(task => task.status === 'pending')
          .sort((a, b) => {
            // 先按优先级排序（high > medium > low）
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
            if (priorityDiff !== 0) return priorityDiff;
            
            // 再按截止日期排序（有截止日期的优先，然后按日期升序）
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          })
          .slice(0, 10); // 只显示前10个
        
        setPendingTasks(pending);
      }

      // 3. 获取团队列表和工作量
      const teamsResponse = await getMyTeams();
      if (teamsResponse.data) {
        setTeams(teamsResponse.data);
        
        // 获取每个团队的统计
        const teamStatsPromises = teamsResponse.data.map(team => getTeamStats(team.id));
        const teamStatsResults = await Promise.all(teamStatsPromises);
        const validTeamStats = teamStatsResults
          .filter(result => result.data)
          .map(result => result.data!);
        setTeamWorkloads(validTeamStats);
      }
    } catch (error) {
      console.error('加载仪表盘数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 计算最近7天每天完成的任务数
  const calculateDailyCompletions = (tasks: Task[]) => {
    const now = new Date();
    const days: DailyCompletion[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const count = tasks.filter(task => {
        if (task.status !== 'completed' || !task.updatedAt) return false;
        const updatedAt = new Date(task.updatedAt);
        return updatedAt >= date && updatedAt < nextDate;
      }).length;
      
      days.push({
        date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        count,
      });
    }
    
    setDailyCompletions(days);
  };

  // 状态映射
  const statusMap: Record<string, { label: string; variant: 'default' | 'info' | 'success' | 'warning' | 'danger' }> = {
    pending: { label: '待处理', variant: 'default' },
    in_progress: { label: '进行中', variant: 'info' },
    completed: { label: '已完成', variant: 'success' },
    cancelled: { label: '已取消', variant: 'default' },
  };

  // 优先级映射
  const priorityMap: Record<string, { label: string; className: string }> = {
    low: { label: '低', className: 'text-gray-500' },
    medium: { label: '中', className: 'text-yellow-500' },
    high: { label: '高', className: 'text-red-500' },
  };

  // 获取最大完成数（用于条形图比例）
  const maxCompletion = Math.max(...dailyCompletions.map(d => d.count), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">仪表盘</h1>
        <p className="text-gray-600 mt-1">欢迎回来，这是你的任务概览</p>
      </div>

      {/* 任务统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">待处理任务</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">
                {taskStats?.byStatus.pending || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">进行中</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">
                {taskStats?.byStatus.in_progress || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">已完成</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">
                {taskStats?.byStatus.completed || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">总任务数</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">
                {taskStats?.total || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最近7天任务完成趋势 */}
        <Card>
          <CardHeader>
            <CardTitle>最近7天任务完成趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dailyCompletions.length > 0 ? (
                <>
                  <div className="flex items-end justify-between gap-2 h-48">
                    {dailyCompletions.map((day, index) => (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full flex flex-col items-center justify-end h-full">
                          <div
                            className="w-full bg-indigo-500 rounded-t transition-all duration-300 hover:bg-indigo-600"
                            style={{
                              height: `${(day.count / maxCompletion) * 100}%`,
                              minHeight: day.count > 0 ? '4px' : '0',
                            }}
                            title={`${day.date}: ${day.count} 个任务`}
                          />
                        </div>
                        <div className="text-xs text-gray-600 mt-2 text-center">
                          <div className="font-medium">{day.count}</div>
                          <div className="text-gray-400">{day.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-sm text-gray-500 text-center">
                    总计完成 {taskStats?.completedLast7Days || 0} 个任务
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  暂无数据
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 团队工作量概览 */}
        <Card>
          <CardHeader>
            <CardTitle>团队工作量概览</CardTitle>
          </CardHeader>
          <CardContent>
            {teamWorkloads.length > 0 ? (
              <div className="space-y-4">
                {teamWorkloads.map((teamStat) => (
                  <div key={teamStat.teamId} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-3">
                      <Link
                        to={`/teams/${teamStat.teamId}`}
                        className="font-semibold text-gray-800 hover:text-indigo-600"
                      >
                        {teamStat.teamName}
                      </Link>
                      <span className="text-sm text-gray-500">
                        完成率: {teamStat.summary.completionRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">总数:</span>
                        <span className="ml-1 font-medium">{teamStat.summary.totalTasks}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">已完成:</span>
                        <span className="ml-1 font-medium text-green-600">{teamStat.summary.completedTasks}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">成员:</span>
                        <span className="ml-1 font-medium">{teamStat.members.length}</span>
                      </div>
                    </div>
                    {teamStat.members.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {teamStat.members.slice(0, 3).map((member) => (
                          <div key={member.userId} className="flex items-center justify-between text-xs text-gray-600">
                            <span>{member.name}</span>
                            <span>
                              进行中: {member.stats.inProgress} | 待处理: {member.stats.pending}
                            </span>
                          </div>
                        ))}
                        {teamStat.members.length > 3 && (
                          <div className="text-xs text-gray-400">
                            还有 {teamStat.members.length - 3} 位成员...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                {teams.length === 0 ? '暂无团队' : '加载中...'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 待办任务列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>待办任务</CardTitle>
            <Link to="/tasks?status=pending" className="text-sm text-indigo-600 hover:text-indigo-500">
              查看全部
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {pendingTasks.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {pendingTasks.map((task) => {
                const daysUntilDue = task.dueDate
                  ? Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : null;
                const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
                const isDueSoon = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 3;

                return (
                  <Link
                    key={task.id}
                    to={`/tasks/${task.id}`}
                    className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className={`text-sm ${priorityMap[task.priority].className} flex-shrink-0`}>
                          ●
                        </span>
                        <span className="font-medium text-gray-800 truncate">{task.title}</span>
                        {task.dueDate && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              isOverdue
                                ? 'bg-red-100 text-red-700'
                                : isDueSoon
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-600'
                            } flex-shrink-0`}
                          >
                            {isOverdue
                              ? `逾期 ${Math.abs(daysUntilDue)} 天`
                              : isDueSoon
                              ? `${daysUntilDue} 天后到期`
                              : new Date(task.dueDate).toLocaleDateString('zh-CN', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                          </span>
                        )}
                      </div>
                      <Badge variant={statusMap[task.status].variant} size="sm">
                        {statusMap[task.status].label}
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">暂无待办任务</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

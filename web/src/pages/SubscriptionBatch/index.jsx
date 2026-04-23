/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Select, Button, Toast, Spinner, Badge } from '@douyinfe/semi-ui';
import { API, showError, showSuccess } from '../../helpers';

const SubscriptionBatch = () => {
  const { t } = useTranslation();

  // Plans state
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);

  // Users state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [userCount, setUserCount] = useState(0);

  // Group filter state
  const [groupOptions, setGroupOptions] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');

  // Selection state
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // Action panel state
  const [actionType, setActionType] = useState(null); // 'bind' | 'unbind'
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [executing, setExecuting] = useState(false);

  // Results state
  const [results, setResults] = useState(null); // { total, successCount, failCount, fails }

  // Load plans
  const loadPlans = async () => {
    setPlansLoading(true);
    try {
      const res = await API.get('/api/subscription/admin/plans?enabled=true');
      if (res.data?.success) {
        // API returns [{plan: {...}}, ...], extract the plan objects
        const planData = res.data.data || [];
        const extractedPlans = planData.map((item) => item.plan);
        setPlans(extractedPlans);
      } else {
        showError(res.data?.message || t('加载失败'));
      }
    } catch (e) {
      showError(t('请求失败'));
    } finally {
      setPlansLoading(false);
    }
  };

  // Load groups
  const loadGroups = async () => {
    try {
      const res = await API.get('/api/group/');
      if (res.data?.success || res.data?.data) {
        const groups = res.data.data || [];
        setGroupOptions([
          { label: t('全部'), value: '' },
          ...groups.map((g) => ({ label: g, value: g })),
        ]);
      }
    } catch (e) {
      showError(t('请求失败'));
    }
  };

  // Load users with pagination
  const loadUsers = async (page = 1, size = pageSize) => {
    setUsersLoading(true);
    try {
      let url = `/api/user/?p=${page}&page_size=${size}`;
      if (selectedGroup) {
        // Use search endpoint for group filtering
        url = `/api/user/search?group=${selectedGroup}&keyword=&p=${page}&page_size=${size}`;
      }
      const res = await API.get(url);
      const { success, message, data } = res.data;
      if (success) {
        const items = data.items || [];
        // Set key for table
        items.forEach((u) => (u.key = u.id));
        setUsers(items);
        setActivePage(data.page);
        setUserCount(data.total);
      } else {
        showError(message);
      }
    } catch (e) {
      showError(t('请求失败'));
    } finally {
      setUsersLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadPlans();
    loadGroups();
    loadUsers();
  }, []);

  // Reload users when group changes
  useEffect(() => {
    setActivePage(1);
    loadUsers(1);
  }, [selectedGroup]);

  // Handle group filter change
  const handleGroupChange = (value) => {
    setSelectedGroup(value || '');
  };

  // Handle page change
  const handlePageChange = (page) => {
    loadUsers(page);
  };

  // Handle page size change
  const handlePageSizeChange = (size) => {
    setPageSize(size);
    loadUsers(1, size);
  };

  // Handle row selection change
  const handleRowSelectionChange = (selectedRowKeys) => {
    setSelectedUserIds(selectedRowKeys);
  };

  // Execute batch action
  const executeAction = async () => {
    if (!actionType || selectedUserIds.length === 0 || !selectedPlanId) {
      return;
    }

    setExecuting(true);
    try {
      const endpoint =
        actionType === 'bind'
          ? '/api/subscription/admin/batch/bind'
          : '/api/subscription/admin/batch/unbind';

      const res = await API.post(endpoint, {
        userIds: selectedUserIds,
        planId: selectedPlanId,
      });

      if (res.data?.success) {
        showSuccess(t('操作成功'));
        setResults(res.data.data || {});
      } else {
        showError(res.data?.message || t('操作失败'));
      }
    } catch (e) {
      showError(t('请求失败'));
    } finally {
      setExecuting(false);
    }
  };

  // Cancel action
  const cancelAction = () => {
    setActionType(null);
    setSelectedPlanId(null);
    setResults(null);
  };

  // Reset selection
  const clearSelection = () => {
    setSelectedUserIds([]);
    setActionType(null);
    setSelectedPlanId(null);
    setResults(null);
  };

  // Table columns
  const columns = useMemo(() => [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
    },
    {
      title: t('用户名'),
      dataIndex: 'username',
      width: 120,
    },
    {
      title: t('用户组'),
      dataIndex: 'group',
      width: 120,
    },
    {
      title: t('状态'),
      dataIndex: 'status',
      width: 80,
      render: (status) => {
        return status === 1 ? (
          <Badge dot color='green'>{t('正常')}</Badge>
        ) : (
          <Badge dot color='red'>{t('禁用')}</Badge>
        );
      },
    },
  ], []);

  // Plan options for select
  const planOptions = plans.map((plan) => ({
    label: plan.title || `Plan ${plan.id}`,
    value: plan.id,
  }));

  return (
    <div className='mt-[60px] px-2'>
      <div className='flex gap-4'>
        {/* Left Panel - User Selection */}
        <div className='flex-1' style={{ width: '70%' }}>
          <div className='bg-white rounded-lg p-4 shadow-sm'>
            <div className='flex items-center gap-4 mb-4'>
              <span className='font-medium'>{t('用户组筛选')}:</span>
              <Select
                value={selectedGroup}
                onChange={handleGroupChange}
                optionList={groupOptions}
                style={{ width: 200 }}
                placeholder={t('选择用户组')}
              />
              <span className='text-gray-500 text-sm'>
                {t('已选择')} {selectedUserIds.length} {t('个用户')}
              </span>
            </div>

            <Table
              columns={columns}
              dataSource={users}
              loading={usersLoading}
              rowKey='id'
              rowSelection={{
                selectedRowKeys: selectedUserIds,
                onChange: handleRowSelectionChange,
              }}
              pagination={{
                currentPage: activePage,
                pageSize: pageSize,
                total: userCount,
                pageSizeOpts: [20, 50, 100],
                showSizeChanger: true,
                onPageSizeChange: handlePageSizeChange,
                onPageChange: handlePageChange,
              }}
              empty={
                <div className='py-8 text-center text-gray-500'>
                  {t('暂无数据')}
                </div>
              }
            />

            {selectedUserIds.length > 0 && (
              <div className='mt-4 flex items-center gap-4'>
                <Button onClick={clearSelection} size='small' type='warning'>
                  {t('清空选择')}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Actions */}
        <div style={{ width: '30%' }}>
          <div className='bg-white rounded-lg p-4 shadow-sm sticky top-4'>
            <h3 className='font-medium mb-4'>{t('批量操作')}</h3>

            {/* Action Buttons */}
            <div className='flex flex-col gap-2 mb-4'>
              <Button
                type='primary'
                disabled={selectedUserIds.length === 0}
                onClick={() => setActionType('bind')}
                theme='solid'
                className='w-full'
              >
                {t('批量添加订阅')}
              </Button>
              <Button
                type='danger'
                disabled={selectedUserIds.length === 0}
                onClick={() => setActionType('unbind')}
                theme='solid'
                className='w-full'
              >
                {t('批量删除订阅')}
              </Button>
            </div>

            {/* Plan Selector - shown when action is selected */}
            {actionType && (
              <div className='border-t pt-4'>
                <div className='mb-4'>
                  <Select
                    value={selectedPlanId}
                    onChange={setSelectedPlanId}
                    optionList={planOptions}
                    placeholder={t('选择套餐')}
                    loading={plansLoading}
                    style={{ width: '100%' }}
                  />
                </div>

                <div className='text-sm text-gray-500 mb-4'>
                  {actionType === 'bind'
                    ? t('将为以下用户添加订阅：')
                    : t('将从以下用户删除订阅：')}
                  {selectedUserIds.length} {t('个用户')}
                </div>

                <div className='flex gap-2'>
                  <Button
                    type='primary'
                    disabled={!selectedPlanId}
                    loading={executing}
                    onClick={executeAction}
                    className='flex-1'
                  >
                    {t('确认')}
                  </Button>
                  <Button type='tertiary' onClick={cancelAction} className='flex-1'>
                    {t('取消')}
                  </Button>
                </div>
              </div>
            )}

            {/* Results Display */}
            {results && (
              <div className='border-t pt-4 mt-4'>
                <h4 className='font-medium mb-2'>{t('执行结果')}</h4>
                <div className='text-sm space-y-2'>
                  <div className='flex justify-between'>
                    <span>{t('总数')}:</span>
                    <span className='font-medium'>{results.total}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span>{t('成功')}:</span>
                    <span className='font-medium text-green-600'>
                      {results.successCount}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span>{t('失败')}:</span>
                    <span className='font-medium text-red-600'>
                      {results.failCount}
                    </span>
                  </div>
                  {results.fails && results.fails.length > 0 && (
                    <div className='mt-2 max-h-40 overflow-y-auto'>
                      <div className='text-red-500 text-xs'>
                        {results.fails.map((fail, idx) => (
                          <div key={idx} className='mb-1'>
                            {t('用户')} {fail.userId}: {fail.reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionBatch;
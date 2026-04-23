# 批量订阅管理功能设计

## 1. 概述

为管理员提供批量管理用户订阅的能力，支持批量添加和批量删除用户订阅。

## 2. 页面结构

**路径:** `/admin/subscription/batch`

**左侧 - 用户选择区**
- 顶部：用户组筛选下拉（显示所有用户组）
- 中部：用户列表（分页，每页 20-50 条）
  - 每行：复选框 + 用户ID + 用户名 + 用户组 + 状态
- 底部：全选/取消全选 + 已选择 N 个用户

**右侧 - 操作确认区**
- 上方：两个大按钮「批量添加订阅」「批量删除订阅」
- 点击按钮后展开：
  - 套餐选择下拉
  - 操作说明（"将替换以下用户的订阅：xx 个用户"）
  - 确认 / 取消按钮
- 完成后显示处理结果（成功 N 个，失败 N 个，失败详情）

**顶部面包屑:** 管理后台 / 订阅管理 / 批量管理

## 3. 导航结构

```
订阅管理（父级菜单）
├── 订阅管理      → /admin/subscription
└── 批量订阅       → /admin/subscription/batch
```

## 4. API 设计

### 批量添加订阅

```
POST /api/subscription/admin/batch/bind
Body: {
  userIds: [1, 2, 3],     // 用户 ID 列表
  planId: 123             // 套餐 ID
}
Response: {
  success: true,
  data: {
    total: 3,
    successCount: 3,
    failCount: 0,
    fails: []
  }
}
```

**替换逻辑:**
1. 查询用户已有该套餐的订阅
2. 执行 `AdminDeleteUserSubscription` 删除旧订阅
3. 执行 `AdminBindSubscription` 创建新订阅

### 批量删除订阅

```
POST /api/subscription/admin/batch/unbind
Body: {
  userIds: [1, 2, 3],
  planId: 123
}
Response: {
  success: true,
  data: {
    total: 3,
    successCount: 3,
    failCount: 0,
    fails: []
  }
}
```

**删除逻辑:**
1. 查询该用户该套餐的订阅
2. 执行 `AdminDeleteUserSubscription` 删除

### 补充接口（前端需要）

```
GET /api/subscription/admin/plans?enabled=true   // 获取可用的套餐列表
GET /admin/api/group/list                         // 获取用户组列表（复用现有接口）
GET /api/admin/users?groupId=xxx&page=1&size=20   // 分页获取用户列表（带用户组筛选）
```

## 5. 结果展示

批量操作完成后：
- 显示成功数量
- 显示失败数量及详情（用户ID + 失败原因）
- 失败时不影响成功项的處理

## 6. 实现文件

### 后端

| 文件 | 说明 |
|------|------|
| `controller/subscription.go` | 新增批量操作 Controller |
| `service/subscription.go` | 新增批量操作 Service 方法 |
| `router/api-router.go` | 新增路由配置 |

### 前端

| 文件 | 说明 |
|------|------|
| `web/src/pages/Admin/Management/SubscriptionBatch/index.tsx` | 批量管理页面 |
| `web/src/router/Admin.tsx` | 路由配置 |
| `web/src/locales/{lang}.json` | 国际化文案 |

## 7. 异常处理

- 用户 ID 不存在 → 跳过并记入失败列表
- 套餐 ID 不存在 → 返回参数错误
- 数据库操作失败 → 记入失败列表，继续处理其他用户

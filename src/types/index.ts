export interface ZeroClawInstance {
  id: string;
  name: string;
  containerId?: string;
  status: 'running' | 'stopped' | 'paused' | 'restarting' | 'exited' | 'created' | 'unknown';
  port?: number;
  config: ZeroClawConfig;
  createdAt: string;
  lastActive?: string;
  memory?: {
    usage: number;
    limit: number;
  };
  cpu?: {
    usage: number;
  };
  memoryLimit?: number; // configured limit in MB
  cpuLimit?: number; // configured limit in cores
  configApplying?: boolean; // indicates if template config is being applied asynchronously
}

export interface ZeroClawConfig {
  default_provider?: string;
  default_model?: string;
  default_temperature?: number;
  model_routes?: any[];
  embedding_routes?: any[];
  observability?: {
    backend?: string;
    runtime_trace_mode?: string;
    runtime_trace_path?: string;
    runtime_trace_max_entries?: number;
  };
  autonomy?: {
    level?: string;
    workspace_only?: boolean;
    allowed_commands?: string[];
    forbidden_paths?: string[];
    max_actions_per_hour?: number;
    max_cost_per_day_cents?: number;
    require_approval_for_medium_risk?: boolean;
    block_high_risk_commands?: boolean;
    shell_env_passthrough?: string[];
    auto_approve?: string[];
    always_ask?: string[];
    allowed_roots?: string[];
    non_cli_excluded_tools?: string[];
  };
  security?: {
    sandbox?: {
      backend?: string;
      firejail_args?: string[];
    };
    resources?: {
      max_memory_mb?: number;
      max_cpu_time_seconds?: number;
      max_subprocesses?: number;
      memory_monitoring?: boolean;
    };
    audit?: {
      enabled?: boolean;
      log_path?: string;
      max_size_mb?: number;
      sign_events?: boolean;
    };
  };
  runtime?: {
    kind?: string;
    docker?: {
      image?: string;
      network?: string;
      memory_limit_mb?: number;
      cpu_limit?: number;
      read_only_rootfs?: boolean;
      mount_workspace?: boolean;
      allowed_workspace_roots?: string[];
      env?: string[];
    };
  };
  gateway?: {
    port?: number;
    host?: string;
    require_pairing?: boolean;
    allow_public_bind?: boolean;
  };
  memory?: {
    backend?: string;
    auto_save?: boolean;
    hygiene_enabled?: boolean;
    archive_after_days?: number;
    purge_after_days?: number;
  };
  channels_config?: {
    cli?: boolean;
    message_timeout_secs?: number;
    telegram?: {
      bot_token?: string;
      allowed_users?: string[];
      stream_mode?: 'off' | 'partial';
      draft_update_interval_ms?: number;
      mention_only?: boolean;
      interrupt_on_new_message?: boolean;
      ack_enabled?: boolean;
      group_reply?: {
        mode?: 'all_messages' | 'mention_only';
        allowed_sender_ids?: string[];
      };
    };
    qq?: {
      app_id?: string;
      app_secret?: string;
      allowed_users?: string[];
    };
  };
  web_search?: {
    enabled?: boolean;
    provider?: 'duckduckgo' | 'brave';
    brave_api_key?: string | null;
    max_results?: number;
    timeout_secs?: number;
  };
  web_fetch?: {
    enabled?: boolean;
    allowed_domains?: string[];
    blocked_domains?: string[];
    max_response_size?: number;
    timeout_secs?: number;
  };
  [key: string]: any;
}

export interface ContainerStats {
  id: string;
  name: string;
  state: string;
  status: string;
  created: string;
  ports: string[];
  memory: {
    usage: number;
    limit: number;
    percentage: number;
  };
  cpu: number;
}

export interface CreateInstanceOptions {
  name: string;
  port?: number;
  apiKey?: string;
  provider?: string;
  model?: string;
  baseUrl?: string;
  temperature?: number;
  config?: ZeroClawConfig;
  memoryLimit?: number; // in MB
  cpuLimit?: number; // in cores (e.g., 0.5 for half a core)
}

export interface AgentTemplate {
  id: string;
  name: string;
  description?: string;
  config: {
    apiKey?: string;
    provider?: string;
    model?: string;
    baseUrl?: string;
    temperature?: number;
  };
}

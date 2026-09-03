def service_group_tags:
  ["streaming", "ai", "telegram", "microsoft", "apple", "google", "github"];

def service_rule_set_tags:
  [
    "category-ai-!cn",
    "youtube",
    "netflix",
    "disney",
    "spotify",
    "tiktok",
    "telegram",
    "microsoft",
    "onedrive",
    "apple",
    "google",
    "github"
  ];

def service_selector($tag; $default):
  {
    "type": "selector",
    "tag": $tag,
    "outbounds": ["select", "auto", "udp-auto", "direct"],
    "default": $default,
    "interrupt_exist_connections": false
  };

def remote_geosite($tag):
  {
    "type": "remote",
    "tag": $tag,
    "format": "binary",
    "url": ("https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/" + $tag + ".srs"),
    "http_client": "rule-set-direct"
  };

.outbounds as $outbounds
| .outbounds = (
    [
      $outbounds[]
      | . as $item
      | select((service_group_tags | index($item.tag)) == null)
      | select(.tag != "direct" and .tag != "GLOBAL")
    ]
    + [
        service_selector("streaming"; "select"),
        service_selector("ai"; "select"),
        service_selector("telegram"; "select"),
        service_selector("microsoft"; "direct"),
        service_selector("apple"; "direct"),
        service_selector("google"; "select"),
        service_selector("github"; "select")
      ]
    + [$outbounds[] | select(.tag == "direct" or .tag == "GLOBAL")]
  )
| .route.rules as $rules
| .route.rules = (
    [
      $rules[]
      | . as $item
      | select((service_rule_set_tags | index($item.rule_set // "")) == null)
      | select((.rule_set // "") != "geolocation-!cn")
    ]
    + [
        {"rule_set": "category-ai-!cn", "action": "route", "outbound": "ai"},
        {"rule_set": "youtube", "action": "route", "outbound": "streaming"},
        {"rule_set": "netflix", "action": "route", "outbound": "streaming"},
        {"rule_set": "disney", "action": "route", "outbound": "streaming"},
        {"rule_set": "spotify", "action": "route", "outbound": "streaming"},
        {"rule_set": "tiktok", "action": "route", "outbound": "streaming"},
        {"rule_set": "telegram", "action": "route", "outbound": "telegram"},
        {"rule_set": "microsoft", "action": "route", "outbound": "microsoft"},
        {"rule_set": "onedrive", "action": "route", "outbound": "microsoft"},
        {"rule_set": "apple", "action": "route", "outbound": "apple"},
        {"rule_set": "google", "action": "route", "outbound": "google"},
        {"rule_set": "github", "action": "route", "outbound": "github"}
      ]
    + [$rules[] | select((.rule_set // "") == "geolocation-!cn")]
  )
| .route.rule_set as $rule_sets
| .route.rule_set = (
    [
      $rule_sets[]
      | . as $item
      | select((service_rule_set_tags | index($item.tag)) == null)
    ]
    + [service_rule_set_tags[] | remote_geosite(.)]
  )
| del(.inbounds[0].strict_route, .route.auto_detect_interface)

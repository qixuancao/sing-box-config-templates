"""Apply constrained platform deltas to the selected versioned TUN base.

Arrays such as TUN address are replaced in full, not concatenated. Unknown
fields or core-specific fields on incompatible versions fail the build.
"""
import copy

PLATFORM_FIELDS = {
    "android": set(),
    "ios": set(),
    "macos": set(),
    "linux": {"strict_route", "auto_redirect", "dns_mode"},
    "windows": {"strict_route", "dns_mode"},
}


def apply_tun_overlays(config, version, platform, settings):
    if platform not in PLATFORM_FIELDS:
        raise ValueError(f"Unsupported TUN platform: {platform}")

    platform_delta = settings.get("tun_options", {})
    core_overrides = settings.get("tun_options_by_core", {})
    if not isinstance(core_overrides, dict) or set(core_overrides) - {"1.13", "1.14", "1.15"}:
        raise ValueError("Unexpected TUN core override version")
    version_delta = core_overrides.get(version, {})
    changes = (platform_delta, version_delta)
    if not all(isinstance(delta, dict) for delta in changes):
        raise ValueError("TUN overrides must be JSON objects")
    for delta in (platform_delta, version_delta):
        if set(delta) - PLATFORM_FIELDS[platform]:
            raise ValueError(f"Unsupported {platform} TUN field")
    if not any(changes):
        return

    tun_items = [inbound for inbound in config["inbounds"] if inbound.get("type") == "tun"]
    if not tun_items:
        # Mixed HTTP/SOCKS profiles ignore platform TUN-only options.
        return
    if len(tun_items) != 1:
        raise ValueError("TUN overrides require exactly one TUN inbound")
    tun = tun_items[0]

    # Platform and version-specific fields must have disjoint ownership.
    updated = set()
    for delta in changes:
        if updated & set(delta):
            raise ValueError("Conflicting TUN platform/version overrides")
        updated.update(delta)
        tun.update(copy.deepcopy(delta))

    if "dns_mode" in tun and version == "1.13":
        raise ValueError("dns_mode is not supported on sing-box 1.13")
    if "stack" in tun and version == "1.15":
        raise ValueError("TUN stack was removed in sing-box 1.15")

"""
MEEET Trust Guard CLI

Command-line interface for trust verification.
"""

import argparse
import json
import sys

from meeet_trust import MeeetGuard, TrustScoreTooLow, SaraRiskTooHigh, TrustApiError


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="MEEET Trust Guard - Verify agent trust scores"
    )
    parser.add_argument(
        "agent_did",
        help="Agent DID (e.g., did:meeet:agent123)",
    )
    parser.add_argument(
        "--api-key", "-k",
        help="MEEET API key (or set MEEET_API_KEY env var)",
    )
    parser.add_argument(
        "--min-trust", "-t",
        type=float,
        default=0.7,
        help="Minimum trust score (0.0-1.0, default: 0.7)",
    )
    parser.add_argument(
        "--max-sara", "-s",
        type=float,
        default=0.6,
        help="Maximum SARA risk (0.0-1.0, default: 0.6)",
    )
    parser.add_argument(
        "--json", "-j",
        action="store_true",
        help="Output as JSON",
    )
    parser.add_argument(
        "--base-url",
        default="https://meeet.world/api",
        help="API base URL",
    )
    
    args = parser.parse_args()
    
    guard = MeeetGuard(
        api_key=args.api_key,
        base_url=args.base_url,
    )
    
    try:
        result = guard.verify(
            agent_did=args.agent_did,
            min_trust=args.min_trust,
            max_sara=args.max_sara,
        )
        
        if args.json:
            output = {
                "agent_did": result.agent_did,
                "trust_score": result.trust_score,
                "sara_risk": result.sara_risk,
                "trust_level": result.trust_level,
                "capabilities": result.capabilities,
                "domains": result.domains,
                "reputation": result.reputation,
                "is_verified": result.is_verified,
                "verified": True,
            }
            print(json.dumps(output, indent=2))
        else:
            print(f"✅ Verified: {result.agent_did}")
            print(f"   Trust Score: {result.trust_score}")
            print(f"   SARA Risk:   {result.sara_risk}")
            print(f"   Level:       {result.trust_level}")
            print(f"   Reputation:  {result.reputation}")
            print(f"   Verified:    {result.is_verified}")
            if result.capabilities:
                print(f"   Capabilities: {', '.join(result.capabilities)}")
            if result.domains:
                print(f"   Domains:      {', '.join(result.domains)}")
        
        return 0
        
    except TrustScoreTooLow as e:
        if args.json:
            print(json.dumps({"error": "low_trust", "message": str(e), "verified": False}))
        else:
            print(f"❌ BLOCKED: Trust score {e.score} below threshold {e.threshold}", file=sys.stderr)
        return 1
        
    except SaraRiskTooHigh as e:
        if args.json:
            print(json.dumps({"error": "high_sara", "message": str(e), "verified": False}))
        else:
            print(f"❌ BLOCKED: SARA risk {e.risk_score} above threshold {e.threshold}", file=sys.stderr)
        return 1
        
    except TrustApiError as e:
        if args.json:
            print(json.dumps({"error": "api_error", "message": str(e), "verified": False}))
        else:
            print(f"❌ API Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())

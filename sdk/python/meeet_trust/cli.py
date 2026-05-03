"""
Command-line interface for MEEET Trust verification.
"""

import argparse
import sys
import json
from meeet_trust import MeeetGuard
from meeet_trust.client import TrustScore


def verify_command(args):
    """Verify an agent's trust score."""
    guard = MeeetGuard(api_key=args.api_key)
    
    try:
        trust_score = guard.verify(args.agent_did)
        
        print(f"\n{'='*50}")
        print(f"Agent: {trust_score.agent_did}")
        print(f"{'='*50}")
        print(f"Trust Score:  {trust_score.trust_score:.2f} / 1.00")
        print(f"SARA Risk:    {trust_score.sara_risk:.2f} / 1.00")
        print(f"Gates Passed: {trust_score.gates_passed} / {trust_score.gates_total}")
        print(f"Reputation:   {trust_score.reputation}")
        print(f"Stake:        {trust_score.stake_amount:.2f} MEEET")
        print(f"Verified:     {'✓ Yes' if trust_score.verified else '✗ No'}")
        print(f"{'='*50}\n")
        
        if args.json:
            print(json.dumps(trust_score.raw_response, indent=2))
        
        return 0 if trust_score.verified else 1
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1


def check_command(args):
    """Check if agent passes verification thresholds."""
    guard = MeeetGuard(api_key=args.api_key)
    
    try:
        is_verified = guard.check(
            args.agent_did,
            min_trust=args.min_trust,
            max_sara_risk=args.max_risk
        )
        
        if is_verified:
            print(f"✓ Agent {args.agent_did} passes verification")
            print(f"  min_trust: {args.min_trust}, max_risk: {args.max_risk}")
            return 0
        else:
            print(f"✗ Agent {args.agent_did} fails verification")
            print(f"  min_trust: {args.min_trust}, max_risk: {args.max_risk}")
            return 1
            
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="MEEET Trust Guard CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  meeet-trust verify did:meeet:agent123 --api-key YOUR_KEY
  meeet-trust check did:meeet:agent123 --api-key YOUR_KEY --min-trust 0.8
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # Verify command
    verify_parser = subparsers.add_parser("verify", help="Verify agent trust score")
    verify_parser.add_argument("agent_did", help="Agent DID (e.g., did:meeet:agent123)")
    verify_parser.add_argument("--api-key", required=True, help="MEEET API key")
    verify_parser.add_argument("--json", action="store_true", help="Output raw JSON")
    
    # Check command
    check_parser = subparsers.add_parser("check", help="Check if agent passes thresholds")
    check_parser.add_argument("agent_did", help="Agent DID")
    check_parser.add_argument("--api-key", required=True, help="MEEET API key")
    check_parser.add_argument("--min-trust", type=float, default=0.5, help="Minimum trust score")
    check_parser.add_argument("--max-risk", type=float, default=0.6, help="Maximum SARA risk")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    if args.command == "verify":
        return verify_command(args)
    elif args.command == "check":
        return check_command(args)
    
    return 0


if __name__ == "__main__":
    sys.exit(main())

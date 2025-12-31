# n8n-nodes-numerai

> [Velocity BPA Licensing Notice]
>
> This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
>
> Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.
>
> For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.

A comprehensive n8n community node for the Numerai AI hedge fund tournament platform, providing complete integration with tournament rounds, model management, stake operations, dataset access, and automated monitoring.

![n8n Community Node](https://img.shields.io/badge/n8n-community%20node-orange)
![License](https://img.shields.io/badge/license-BSL--1.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)

## Features

- **8 Resource Categories** with 50+ operations
- **Round Management**: Track tournament rounds, deadlines, and resolution
- **Model Operations**: Create models, upload predictions, track performance
- **Stake Management**: Increase/decrease stakes, set targets, monitor risk
- **Account Integration**: Balance tracking, transactions, earnings reports
- **Dataset Access**: Download training, validation, and live data
- **Leaderboard Queries**: Rankings, reputation, performance metrics
- **Signals Support**: Upload signals, manage stock universe
- **Diagnostics**: Validation stats, feature exposure, Sharpe ratio

## Installation

### Community Nodes (Recommended)

1. Open n8n
2. Go to **Settings** → **Community Nodes**
3. Click **Install**
4. Enter `n8n-nodes-numerai`
5. Click **Install**

### Manual Installation

```bash
# Navigate to your n8n installation
cd ~/.n8n

# Install the package
npm install n8n-nodes-numerai
```

### Development Installation

```bash
# Clone the repository
git clone https://github.com/Velocity-BPA/n8n-nodes-numerai.git
cd n8n-nodes-numerai

# Install dependencies
npm install

# Build the project
npm run build

# Create symlink
mkdir -p ~/.n8n/custom
ln -s $(pwd) ~/.n8n/custom/n8n-nodes-numerai

# Restart n8n
```

## Credentials Setup

| Field | Description |
|-------|-------------|
| Public ID | Your Numerai API public key |
| Secret Key | Your Numerai API secret key |
| Tournament | Classic (default) or Signals |

Get your API keys from [Numerai Account Settings](https://numer.ai/account).

## Resources & Operations

### Round Resource
- **Get Current Round**: Current tournament round with timing info
- **Get Round**: Specific round by number
- **List Rounds**: Tournament round history
- **Check Round Open**: Verify submission window status
- **Get Round Dates**: All important round dates
- **Get Resolve Date**: Resolution timing

### Model Resource
- **List Models**: All your tournament models
- **Get Model**: Model details by name
- **Get Performance**: Performance metrics and scores
- **Get Rank**: Model rankings (overall, corr, mmc, tc)
- **Create Model**: Create new tournament model
- **Upload Predictions**: Submit CSV predictions
- **Upload Model**: Upload pickle for Numerai Compute
- **Submission Status**: Latest submission state
- **Submission Info**: Detailed submission history

### Stake Resource
- **Get Stake**: Current stake for a model
- **List Stakes**: All model stakes with summary
- **Increase Stake**: Add NMR to model stake
- **Decrease Stake**: Reduce model stake
- **Set Target Stake**: Configure auto-adjustment target
- **Drain Stake**: Completely remove stake
- **Stake History**: Historical stake changes
- **Pending Changes**: Upcoming stake modifications

### Account Resource
- **Get Account**: Profile info, wallet, MFA status
- **Get Balance**: NMR balance breakdown
- **Get Transactions**: Transaction history
- **Get Earnings**: Earnings by model
- **Get Payout History**: Payout records

### Dataset Resource
- **Get Dataset URLs**: Download links for all data
- **Get Current Dataset**: Current round availability
- **Download Dataset**: Download training/validation/live data
- **Get Dataset Versions**: Version information
- **Get Feature Metadata**: Feature details
- **Get Target Info**: Target information

### Leaderboard Resource
- **Get Tournament Leaderboard**: Full rankings
- **Get Model Position**: Your model's rank
- **Get Top Performers**: Top N users
- **Get Reputation Rankings**: Reputation-sorted leaderboard
- **Get V2 Leaderboard**: Detailed V2 leaderboard

### Signals Resource
- **Upload Signals**: Submit signal predictions
- **Get Universe**: Stock ticker universe
- **Get Diagnostics**: Signal validation stats
- **Get Submission**: Latest signal submission
- **Get Historical Targets**: Backtesting data URL

### Diagnostics Resource
- **Model Diagnostics**: Comprehensive model analysis
- **Validation Stats**: Prediction validation metrics
- **Feature Exposure**: Feature correlation analysis
- **Get Correlation**: Correlation scores
- **Get Sharpe Ratio**: Risk-adjusted returns
- **Get Max Drawdown**: Maximum loss metrics

## Trigger Node

The **Numerai Trigger** node monitors for events:

| Trigger | Description |
|---------|-------------|
| New Round Started | When a new round opens |
| Round Closing Soon | Configurable warning before close |
| Round Resolved | When scores become available |
| Scores Released | New performance scores |
| Submission Received | Submission confirmation |
| Submission Scored | Scores available for submission |
| Submission Failed | Submission validation failure |
| Stake Changed | Any stake modifications |
| Payout Received | Earnings distributed |
| Stake At Risk | Poor performance warning |

## Usage Examples

### Download Live Data and Upload Predictions

```
1. Numerai → Dataset → Download Dataset (type: live)
2. Code Node → Process data, generate predictions
3. Numerai → Model → Upload Predictions
```

### Monitor Model Performance

```
1. Numerai Trigger (trigger: scoresReleased)
2. Numerai → Model → Get Performance
3. IF Node → Check if corr < threshold
4. Slack → Send alert
```

### Daily Stake Report

```
1. Schedule Trigger (daily)
2. Numerai → Stake → List Stakes
3. Numerai → Account → Get Balance
4. Email → Send summary report
```

## Numerai Concepts

| Term | Description |
|------|-------------|
| NMR | Numeraire token - stake and reward currency |
| Round | Weekly tournament cycle (opens Saturday, closes Monday) |
| Predictions | Model outputs submitted for scoring |
| Stake | NMR locked on model performance |
| Corr | Correlation - primary performance metric |
| TC | True Contribution - value added to meta-model |
| MMC | Meta Model Contribution |
| FNC | Feature Neutral Correlation |
| BMC | Bonus Meta Contribution |
| Reputation | Historical model consistency |

## Tournament Types

| Tournament | ID | Description |
|------------|-----|-------------|
| Classic | 1 | Stock market predictions using Numerai data |
| Signals | 11 | Custom signal predictions on stocks |

## Error Handling

The node provides detailed error messages for common issues:
- Invalid credentials
- Missing required fields
- Invalid prediction format
- Insufficient stake balance
- Round closed for submissions
- API rate limiting

## Security Best Practices

1. Store API keys in n8n credentials (encrypted)
2. Use separate API keys for production vs testing
3. Monitor stake amounts via triggers
4. Set up alerts for failed submissions
5. Review transaction history regularly

## Development

```bash
# Run linting
npm run lint

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build project
npm run build
```

## Author

**Velocity BPA**
- Website: [velobpa.com](https://velobpa.com)
- GitHub: [Velocity-BPA](https://github.com/Velocity-BPA)

## Licensing

This n8n community node is licensed under the **Business Source License 1.1**.

### Free Use
Permitted for personal, educational, research, and internal business use.

### Commercial Use
Use of this node within any SaaS, PaaS, hosted platform, managed service,
or paid automation offering requires a commercial license.

For licensing inquiries:
**licensing@velobpa.com**

See [LICENSE](LICENSE), [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md), and [LICENSING_FAQ.md](LICENSING_FAQ.md) for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## Support

- [Numerai Documentation](https://docs.numer.ai/)
- [Numerai Forum](https://forum.numer.ai/)
- [n8n Community](https://community.n8n.io/)
- Issues: [GitHub Issues](https://github.com/Velocity-BPA/n8n-nodes-numerai/issues)

## Acknowledgments

- [Numerai](https://numer.ai/) for the innovative tournament platform
- [n8n](https://n8n.io/) for the workflow automation framework
- The Numerai community for API feedback and testing

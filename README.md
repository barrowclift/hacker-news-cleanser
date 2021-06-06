# Hacker News Cleanser

This is a self-hosted service that will auto-hide Hacker News articles by:

* Site
* Title keywords matching
* Title regex matching
* Username

You can download the latest release [here](https://github.com/barrowclift/hacker-news-cleanser/releases/tag/v2.5)

## Why This Exists

I've been a "lurker" on Hacker News for three years and have long enjoyed reading the thoughtful articles and sometimes heated but always informative comments.

However, over the past year or so I've noticed a trend of articles covering an array of other topics making their way into the front page more frequently and in greater numbers. *And that's fine*. The Internet and Hacker News does not exist to exclusively serve my fussy requirements, and clearly the articles and their information are valuable to others.

With that said, it does somewhat diminish my personal Hacker News experience, given that I tend to prefer articles that are strictly related to technology. That means either manually hiding the other articles or clicking past the first page, neither of which is ideal.

That's where the inception of the Hacker News Cleanser came from; it's a "set it and forget it" service that will automatically tailor my home page to more closely fit my personal taste.

## The Compromise Between Being Informed and Information Separation

<img width="638" src="https://raw.githubusercontent.com/barrowclift/hacker-news-cleanser/master/screenshots/email-report.png" />

While I do wish for my personal Hacker News page to be more focused, I also still want to have the ability to see the hidden articles and read them if I so choose. No amount of filter tweaking will prevent the occasional salient article or discussion from getting caught when I would have wished to still see it. Additionally, I do still feel it's important to have a finger on the heartbeat of Hacker News as a whole, only in a separate view and on my own time.

To achieve this, the Hacker News Cleanser supports sending out email reports styled to look just like the Hacker News homepage containing all cleansed articles since the last email report. This requires setting up a Gmail "service" account to send emails through or using an existing Gmail account (not recommended).

Personally, I have the Cleanser set to send an email report of cleansed articles every week, but it can easily be set to daily, bi-weekly, or any other kind of day-length frequency.

## Why Not A Browser Extension?

My portable operating system of choice is iOS, and since Safari on iOS [does not support traditional browser extensions](https://apple.stackexchange.com/a/321213), this would mean my phone (where easily the majority of my browsing and reading occurs) would not benefit.

Additionally, there are many other different browsers out there, and I have a better chance of serving the needs of other similarly-minded Hacker News readers regardless of their preferred browser or platform by focusing on just one product that's independent of the browser landscape.

# Setup

## Installation

See [INSTALL.md](https://github.com/barrowclift/hacker-news-cleanser/blob/master/INSTALL.md).

## Starting and Stopping

Starting and stopping the Hacker News Cleanser is as simple as running `admin/start.sh` or `admin/stop.sh`, respectively.

If you wish to start or stop specific components of the service, use their individual, respective start/stop scripts (not recommended).

## Adding Items To Filter

You can filter articles by site, title, and username. To a new filter item, execute `admin/addBlacklistItem.py`, and the usage string will explain the rest.

# License

The Hacker News Cleanser is open source, licensed under the MIT License.

See [LICENSE](https://github.com/barrowclift/hacker-news-cleanser/blob/master/LICENSE) for more.

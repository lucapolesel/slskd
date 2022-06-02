﻿// <copyright file="Share.cs" company="slskd Team">
//     Copyright (c) slskd Team. All rights reserved.
//
//     This program is free software: you can redistribute it and/or modify
//     it under the terms of the GNU Affero General Public License as published
//     by the Free Software Foundation, either version 3 of the License, or
//     (at your option) any later version.
//
//     This program is distributed in the hope that it will be useful,
//     but WITHOUT ANY WARRANTY; without even the implied warranty of
//     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//     GNU Affero General Public License for more details.
//
//     You should have received a copy of the GNU Affero General Public License
//     along with this program.  If not, see https://www.gnu.org/licenses/.
// </copyright>

namespace slskd.Shares
{
    using System.Linq;
    using System.Text.Json.Serialization;
    using System.Text.RegularExpressions;

    /// <summary>
    ///     A file share.
    /// </summary>
    public sealed class Share
    {
        /// <summary>
        ///     Initializes a new instance of the <see cref="Share"/> class.
        /// </summary>
        /// <param name="id"></param>
        /// <param name="alias"></param>
        /// <param name="isExcluded"></param>
        /// <param name="localPath"></param>
        /// <param name="mask"></param>
        /// <param name="raw"></param>
        /// <param name="remotePath"></param>
        [JsonConstructor]
        public Share (string id, string alias, bool isExcluded, string localPath, string mask, string raw, string remotePath)
        {
            Id = id;
            Alias = alias;
            IsExcluded = isExcluded;
            LocalPath = localPath;
            Mask = mask;
            Raw = raw;
            RemotePath = remotePath;
        }

        /// <summary>
        ///     Initializes a new instance of the <see cref="Share"/> class.
        /// </summary>
        /// <param name="share"></param>
        public Share(string share)
        {
            Raw = share;
            IsExcluded = share.StartsWith('-') || share.StartsWith('!');

            if (IsExcluded)
            {
                share = share[1..];
            }

            // test to see whether an alias has been specified
            var matches = Regex.Matches(share, @"^\[(.*)\](.*)$");

            if (matches.Any())
            {
                // split the alias from the path, and validate the alias
                var groups = matches[0].Groups;
                Alias = groups[1].Value;
                LocalPath = groups[2].Value;
            }
            else
            {
                Alias = share.Split(new[] { '/', '\\' }).Last();
                LocalPath = share;
            }

            var parent = System.IO.Directory.GetParent(LocalPath).FullName.TrimEnd('/', '\\');

            Mask = Compute.MaskHash(parent);

            var maskedPath = LocalPath.ReplaceFirst(parent, Mask);

            var aliasedSegment = LocalPath[(parent.Length + 1)..];
            RemotePath = maskedPath.ReplaceFirst(aliasedSegment, Alias);

            Id = Compute.Sha1Hash(RemotePath);
        }

        public string Id { get; init; }
        public string Alias { get; init; }
        public bool IsExcluded { get; init; }
        public string LocalPath { get; init; }
        public string Mask { get; init; }
        public string Raw { get; init; }
        public string RemotePath { get; init; }
    }
}

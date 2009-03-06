#!/usr/bin/perl -W

# $Id$
# IWWEM/FSConstants.pm
# from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
# Author: JosÈ MarÌa Fern·ndez Gonz·lez (C) 2007-2008
# Institutions:
# *	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
# *	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
#
# This file is part of IWWE&M, the Interactive Web Workflow Enactor & Manager.
# 
# IWWE&M is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
# 
# IWWE&M is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
# 
# You should have received a copy of the GNU Affero General Public License
# along with IWWE&M.  If not, see <http://www.gnu.org/licenses/agpl.txt>.
# 
# Original IWWE&M concept, design and coding done by Jos√© Mar√≠a Fern√°ndez Gonz√°lez, INB (C) 2008.
# Source code of IWWE&M is available at http://trac.bioinfo.cnio.es/trac/iwwem

use strict;

package IWWEM::FSConstants;

use FindBin;
use lib "$FindBin::Bin";

use IWWEM::Config;
use IWWEM::WorkflowCommon;
use IWWEM::InternalWorkflowList::Constants;
use IWWEM::myExperimentWorkflowList::Constants;

use vars qw($VIRTWORKFLOWDIR $VIRTJOBDIR $VIRTIDDIR $VIRTRESULTSDIR);

# Virtual dirs
$VIRTWORKFLOWDIR = 'workflows';
$VIRTJOBDIR = 'enactions';
$VIRTIDDIR = 'id';
$VIRTRESULTSDIR = $IWWEM::WorkflowCommon::RESULTSDIR;

use vars qw($ISRAWFILE $ISFORBIDDEN $ISEXAMPLE $ISINPUT $ISOUTPUT $ISRAWDIR $ISIDDIR $ISENDIR);
# undef means a raw file
$ISRAWFILE=undef;
# -1 means a forbidden file/dir
$ISFORBIDDEN=-1;
# 0, 1 or 2 mean a raw file which is handled as a result.
$ISEXAMPLE=0;
$ISINPUT=1;
$ISOUTPUT=2;
# 10 means a raw directory
$ISRAWDIR=10;
$ISIDDIR=11;
# 20 means an enaction/snapshot directory
$ISENDIR=20;

my($DEPSUBTREE)=[$IWWEM::WorkflowCommon::DEPDIR,$ISRAWDIR,[
		["^[0-9a-f].+[0-9a-f]\\.xml",undef,undef],
	]
];	# Contains only files and no catalog at all


my($ENACTSUBTREE)=[
	$DEPSUBTREE,
	[$VIRTRESULTSDIR,$ISRAWDIR,[
			['^.+',$ISIDDIR,[
					[$IWWEM::WorkflowCommon::INPUTSFILE,$ISINPUT,undef],
					[$IWWEM::WorkflowCommon::OUTPUTSFILE,$ISOUTPUT,undef],
					[$IWWEM::WorkflowCommon::ITERATIONSDIR,$ISRAWDIR,[
							["^[0-9]+",$ISRAWDIR,[
									[$IWWEM::WorkflowCommon::INPUTSFILE,$ISINPUT,undef],
									[$IWWEM::WorkflowCommon::OUTPUTSFILE,$ISOUTPUT,undef],
								]
							],
						]
					],
				]
			],
		]
	],	# Contains lots of directories
	[$IWWEM::WorkflowCommon::WORKFLOWFILE,$ISRAWFILE,undef],
	[$IWWEM::WorkflowCommon::SVGFILE,$ISRAWFILE,undef],
	[$IWWEM::WorkflowCommon::PDFFILE,$ISRAWFILE,undef],
	[$IWWEM::WorkflowCommon::PNGFILE,$ISRAWFILE,undef],
	[$IWWEM::WorkflowCommon::REPORTFILE,$ISRAWFILE,undef],
	[$IWWEM::WorkflowCommon::INPUTSFILE,$ISINPUT,undef],
	[$IWWEM::WorkflowCommon::OUTPUTSFILE,$ISOUTPUT,undef],
];

use vars qw(@PATHCHECK $WFKIND $ENKIND);

$WFKIND=[
	$VIRTWORKFLOWDIR,
	$IWWEM::Config::WORKFLOWDIR,
	[
		["^(?:[a-zA-Z]+:)|(?:[0-9a-fA-F].+[0-9a-fA-F])",$ISIDDIR,[
				[$IWWEM::WorkflowCommon::EXAMPLESDIR,$ISRAWDIR,[
						[$IWWEM::WorkflowCommon::CATALOGFILE,$ISFORBIDDEN,undef],
						["^[0-9a-fA-F].+[0-9a-fA-F]\\.xml",$ISEXAMPLE,undef]
					]
				],	# Contains files
				[$IWWEM::WorkflowCommon::SNAPSHOTSDIR,$ISRAWDIR,[
						[$IWWEM::WorkflowCommon::CATALOGFILE,$ISFORBIDDEN,undef],
						["^[0-9a-fA-F].+[0-9a-fA-F]",$ISIDDIR,$ENACTSUBTREE]
					]
				],	# Contains directories
				$DEPSUBTREE,
				[$IWWEM::WorkflowCommon::WORKFLOWFILE,$ISRAWFILE,undef],
				[$IWWEM::WorkflowCommon::SVGFILE,$ISRAWFILE,undef],
				[$IWWEM::WorkflowCommon::PDFFILE,$ISRAWFILE,undef],
				[$IWWEM::WorkflowCommon::PNGFILE,$ISRAWFILE,undef],
			]
		],
	]
];

$ENKIND=[
	$VIRTJOBDIR,
	$IWWEM::Config::JOBDIR,
	[
		["^[0-9a-fA-F].+[0-9a-fA-F]",$ISIDDIR,$ENACTSUBTREE],
	]
];

@PATHCHECK=(
	$WFKIND,
	$ENKIND, 
	[
		$VIRTIDDIR,
		undef,
		[
			["^${IWWEM::InternalWorkflowList::Constants::WORKFLOWPREFIX}[^:]+",$ISIDDIR,undef],
			["^${IWWEM::InternalWorkflowList::Constants::ENACTIONPREFIX}[^:]+",$ISIDDIR,undef],
			["^${IWWEM::InternalWorkflowList::Constants::SNAPSHOTPREFIX}[^:]+:[^:]+",$ISIDDIR,undef],
			["^${IWWEM::InternalWorkflowList::Constants::EXAMPLEPREFIX}[^:]+:[^:]+",$ISEXAMPLE,undef],
			["^${IWWEM::myExperimentWorkflowList::Constants::MYEXP_PREFIX}[^:]+",$ISIDDIR,undef],
		]
	]
);

1;
